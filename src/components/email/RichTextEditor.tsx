import { useCallback, useRef, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  ImagePlus,
  Minus,
  Loader2,
} from "lucide-react";
import { useState } from "react";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  userId: string;
  placeholder?: string;
}

export default function RichTextEditor({
  content,
  onChange,
  userId,
  placeholder = "Escribe tu mensaje aquí...",
}: RichTextEditorProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      const { error } = await supabase.storage
        .from("email-images")
        .upload(path, file);
      if (error) {
        toast.error("Error subiendo imagen: " + error.message);
        return null;
      }
      const { data } = supabase.storage
        .from("email-images")
        .getPublicUrl(path);
      return data?.publicUrl || null;
    },
    [userId]
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
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

        const imageFile = Array.from(files).find((f) =>
          f.type.startsWith("image/")
        );
        if (!imageFile) return false;

        event.preventDefault();
        setUploading(true);

        const pos = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        });

        uploadImage(imageFile)
          .then((url) => {
            if (url && pos) {
              const node = view.state.schema.nodes.image.create({ src: url });
              const tr = view.state.tr.insert(pos.pos, node);
              view.dispatch(tr);
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

  // Sync external content changes (e.g. form reset)
  useEffect(() => {
    if (editor && content !== editor.getHTML() && content === "") {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

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
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 border-b border-border px-1 py-1 bg-muted/30 flex-wrap">
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

        <div className="w-px h-5 bg-border mx-0.5" />

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

        <div className="w-px h-5 bg-border mx-0.5" />

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
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {uploading && (
        <div className="px-3 py-1 text-xs text-muted-foreground flex items-center gap-1 border-t border-border">
          <Loader2 className="h-3 w-3 animate-spin" />
          Subiendo imagen...
        </div>
      )}
    </div>
  );
}
