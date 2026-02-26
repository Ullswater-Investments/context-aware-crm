import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlignLeft, AlignCenter, AlignRight, Trash2 } from "lucide-react";

interface ImageBubbleMenuProps {
  editor: Editor;
}

const sizes = [
  { label: "25%", value: "25%" },
  { label: "50%", value: "50%" },
  { label: "100%", value: "100%" },
  { label: "Auto", value: "auto" },
];

export default function ImageBubbleMenu({ editor }: ImageBubbleMenuProps) {
  const setWidth = (width: string) =>
    editor.chain().focus().updateAttributes("image", { width }).run();

  const setAlign = (align: string) =>
    editor.chain().focus().updateAttributes("image", { align }).run();

  const currentAlign =
    editor.getAttributes("image").align || "center";
  const currentWidth =
    editor.getAttributes("image").width || "100%";

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor }) => editor.isActive("image")}
      options={{ placement: "top" }}
    >
      <div className="flex items-center gap-0.5 bg-popover border border-border rounded-lg shadow-lg p-1 animate-in zoom-in-95">
        {sizes.map((s) => (
          <Button
            key={s.value}
            type="button"
            variant={currentWidth === s.value ? "secondary" : "outline"}
            size="sm"
            className="h-7 text-[10px] px-2"
            onClick={() => setWidth(s.value)}
          >
            {s.label}
          </Button>
        ))}

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Button
          type="button"
          variant={currentAlign === "left" ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => setAlign("left")}
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant={currentAlign === "center" ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => setAlign("center")}
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant={currentAlign === "right" ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => setAlign("right")}
        >
          <AlignRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </BubbleMenu>
  );
}
