import { useCallback, useRef, useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { FontSize } from "@/lib/tiptap-font-size";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  ImagePlus,
  Minus,
  Loader2,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo2,
  Redo2,
} from "lucide-react";
import ImageBubbleMenu from "./ImageBubbleMenu";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  userId: string;
  placeholder?: string;
}

const FONT_FAMILIES = [
  { label: "Arial", value: "Arial" },
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Georgia", value: "Georgia" },
  { label: "Verdana", value: "Verdana" },
  { label: "Courier New", value: "Courier New" },
];

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "32px"];

// Extended Image with width/align inline styles for email compatibility
const EmailImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: "100%",
        parseHTML: (el) => el.style.width || el.getAttribute("width") || "100%",
      },
      align: {
        default: "center",
        parseHTML: (el) => {
          if (el.style.float === "left") return "left";
          if (el.style.float === "right") return "right";
          return "center";
        },
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    const { width = "100%", align = "center", ...rest } = HTMLAttributes;
    let style = `max-width: 100%; height: auto; width: ${width};`;
    if (align === "left") style += " float: left; margin-right: 1rem; margin-bottom: 1rem;";
    else if (align === "right") style += " float: right; margin-left: 1rem; margin-bottom: 1rem;";
    else style += " display: block; margin-left: auto; margin-right: auto;";
    return ["img", { ...rest, style }];
  },
});

export default function RichTextEditor({
  content,
  onChange,
  userId,
  placeholder = "Escribe tu mensaje aquí...",
}: RichTextEditorProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentFont, setCurrentFont] = useState<string>("");
  const [currentSize, setCurrentSize] = useState<string>("");

  const uploadImage = useCallback(
    async (file: File): Promise<string | null> => {
      if (!file.type.startsWith("image/")) {
        toast.error("Solo se permiten archivos de imagen");
        return null;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("La imagen no puede superar 10MB");
        return null;
      }
      const ext = file.name.split(".").pop() || "png";
      const safeName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const path = `${userId}/${safeName}`;

      const { error } = await supabase.storage.from("email-images").upload(path, file);
      if (error) {
        toast.error("Error subiendo imagen: " + error.message);
        return null;
      }
      const { data } = supabase.storage.from("email-images").getPublicUrl(path);
      return data?.publicUrl || null;
    },
    [userId]
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      EmailImage.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
      TextStyle,
      FontFamily,
      Color,
      Highlight.configure({ multicolor: true }),
      FontSize,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) return false;
            setUploading(true);
            uploadImage(file)
              .then((url) => {
                if (url) {
                  view.dispatch(
                    view.state.tr.replaceSelectionWith(
                      view.state.schema.nodes.image.create({ src: url })
                    )
                  );
                }
              })
              .finally(() => setUploading(false));
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;
        const imageFile = Array.from(files).find((f) => f.type.startsWith("image/"));
        if (!imageFile) return false;
        event.preventDefault();
        setUploading(true);
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
        uploadImage(imageFile)
          .then((url) => {
            if (url && pos) {
              const node = view.state.schema.nodes.image.create({ src: url });
              view.dispatch(view.state.tr.insert(pos.pos, node));
            }
          })
          .finally(() => setUploading(false));
        return true;
      },
      attributes: {
        class:
          "prose max-w-none min-h-[300px] px-6 py-4 text-base focus:outline-none [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md [&_img]:my-2",
      },
    },
  });

  // Sync external content changes (e.g. form reset, template selection)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Track current font/size from selection
  useEffect(() => {
    if (!editor) return;
    const updateAttrs = () => {
      const attrs = editor.getAttributes("textStyle");
      setCurrentFont(attrs.fontFamily || "");
      setCurrentSize(attrs.fontSize || "");
    };
    editor.on("selectionUpdate", updateAttrs);
    editor.on("transaction", updateAttrs);
    return () => {
      editor.off("selectionUpdate", updateAttrs);
      editor.off("transaction", updateAttrs);
    };
  }, [editor]);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;
      e.target.value = "";
      setUploading(true);
      const url = await uploadImage(file);
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
      setUploading(false);
    },
    [editor, uploadImage]
  );

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("URL del enlace:", prev || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="border border-input rounded-md bg-background overflow-hidden">
      {/* Premium Toolbar */}
      <div className="flex items-center gap-0.5 border-b border-border px-1 py-1 bg-muted/30 flex-wrap">
        {/* Undo / Redo */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Deshacer"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Rehacer"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </Button>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* Font Family */}
        <Select
          value={currentFont || undefined}
          onValueChange={(v) => editor.chain().focus().setFontFamily(v).run()}
        >
          <SelectTrigger className="w-[130px] h-7 text-xs">
            <SelectValue placeholder="Tipo de letra" />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((f) => (
              <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Font Size */}
        <Select
          value={currentSize || undefined}
          onValueChange={(v) => editor.chain().focus().setFontSize(v).run()}
        >
          <SelectTrigger className="w-[72px] h-7 text-xs">
            <SelectValue placeholder="16px" />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* Color picker */}
        <input
          type="color"
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          className="w-7 h-7 p-0.5 cursor-pointer bg-transparent border border-input rounded"
          title="Color de texto"
        />

        {/* Highlight */}
        <Button
          type="button"
          variant={editor.isActive("highlight") ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run()}
          title="Resaltar"
        >
          <Highlighter className="h-3.5 w-3.5" />
        </Button>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* Bold */}
        <Button
          type="button"
          variant={editor.isActive("bold") ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Negrita"
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>

        {/* Italic */}
        <Button
          type="button"
          variant={editor.isActive("italic") ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Cursiva"
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* Text Alignment */}
        <Button
          type="button"
          variant={editor.isActive({ textAlign: "left" }) ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          title="Alinear izquierda"
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive({ textAlign: "center" }) ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          title="Centrar"
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive({ textAlign: "right" }) ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          title="Alinear derecha"
        >
          <AlignRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive({ textAlign: "justify" }) ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          title="Justificar"
        >
          <AlignJustify className="h-3.5 w-3.5" />
        </Button>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* Link */}
        <Button
          type="button"
          variant={editor.isActive("link") ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={setLink}
          title="Enlace"
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </Button>

        {/* Bullet List */}
        <Button
          type="button"
          variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Lista"
        >
          <List className="h-3.5 w-3.5" />
        </Button>

        {/* Ordered List */}
        <Button
          type="button"
          variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Lista numerada"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* Horizontal Rule */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Separador"
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>

        {/* Image Upload */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Insertar imagen"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ImagePlus className="h-3.5 w-3.5" />
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Image Bubble Menu */}
      <ImageBubbleMenu editor={editor} />

      {uploading && (
        <div className="px-3 py-1 text-xs text-muted-foreground flex items-center gap-1 border-t border-border">
          <Loader2 className="h-3 w-3 animate-spin" />
          Subiendo imagen...
        </div>
      )}
    </div>
  );
}
