"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Code2,
  Columns3,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Rows3,
  SquarePlay as YoutubeIcon,
  Strikethrough,
  Table as TableIcon,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MermaidNode } from "./mermaid-extension";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface TipTapEditorProps {
  initialContent: unknown;
  onUpdate: (json: unknown) => void;
  placeholder?: string;
  // Storage folder for uploaded images, e.g. "notes/<microthemeId>"
  imagePathPrefix?: string;
  className?: string;
}

async function uploadImage(file: File, pathPrefix: string): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image must be smaller than 5 MB");
  }
  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${pathPrefix}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("note-images")
    .upload(path, file, { cacheControl: "31536000", upsert: false });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data } = supabase.storage.from("note-images").getPublicUrl(path);
  return data.publicUrl;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon"
      className="h-8 w-8"
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </Button>
  );
}

function Toolbar({
  editor,
  imagePathPrefix,
}: {
  editor: Editor;
  imagePathPrefix: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chain = () => editor.chain().focus();

  async function handleImageFile(file: File) {
    try {
      toast.info("Uploading image…");
      const url = await uploadImage(file, imagePathPrefix);
      const caption = window.prompt("Caption for this image (optional):") ?? "";
      chain()
        .setImage({ src: url, alt: caption, title: caption })
        .run();
      toast.success("Image added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Image upload failed");
    }
  }

  function addYoutube() {
    const url = window.prompt("Paste the YouTube video URL:");
    if (!url) return;
    const ok = editor.commands.setYoutubeVideo({ src: url.trim() });
    if (!ok) toast.error("That doesn't look like a valid YouTube URL");
  }

  function setLink() {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL:", previous ?? "https://");
    if (url === null) return;
    if (url === "" || url === "https://") {
      chain().extendMarkRange("link").unsetLink().run();
      return;
    }
    chain().extendMarkRange("link").setLink({ href: url }).run();
  }

  const inTable = editor.isActive("table");

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 p-1.5">
      <ToolbarButton
        title="Heading 1"
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => chain().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => chain().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => chain().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <ToolbarButton
        title="Bold"
        active={editor.isActive("bold")}
        onClick={() => chain().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Italic"
        active={editor.isActive("italic")}
        onClick={() => chain().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Underline"
        active={editor.isActive("underline")}
        onClick={() => chain().toggleUnderline().run()}
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => chain().toggleStrike().run()}
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Inline code"
        active={editor.isActive("code")}
        onClick={() => chain().toggleCode().run()}
      >
        <Code2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Link"
        active={editor.isActive("link")}
        onClick={setLink}
      >
        <Link2 className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <ToolbarButton
        title="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => chain().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => chain().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Quote"
        active={editor.isActive("blockquote")}
        onClick={() => chain().toggleBlockquote().run()}
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Divider"
        onClick={() => chain().setHorizontalRule().run()}
      >
        <Minus className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {!inTable ? (
        <ToolbarButton
          title="Insert table"
          onClick={() =>
            chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
        >
          <TableIcon className="h-4 w-4" />
        </ToolbarButton>
      ) : (
        <>
          <ToolbarButton
            title="Add row below"
            onClick={() => chain().addRowAfter().run()}
          >
            <Rows3 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Add column right"
            onClick={() => chain().addColumnAfter().run()}
          >
            <Columns3 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Delete table"
            onClick={() => chain().deleteTable().run()}
          >
            <Trash2 className="h-4 w-4" />
          </ToolbarButton>
        </>
      )}

      <ToolbarButton
        title="Insert image"
        onClick={() => fileInputRef.current?.click()}
      >
        <ImageIcon className="h-4 w-4" />
      </ToolbarButton>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImageFile(file);
          e.target.value = "";
        }}
      />
      <ToolbarButton title="Embed YouTube video" onClick={addYoutube}>
        <YoutubeIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Insert Mermaid diagram"
        onClick={() => editor.chain().focus().insertMermaid().run()}
      >
        <Workflow className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <ToolbarButton
        title="Undo"
        disabled={!editor.can().undo()}
        onClick={() => chain().undo().run()}
      >
        <Undo2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Redo"
        disabled={!editor.can().redo()}
        onClick={() => chain().redo().run()}
      >
        <Redo2 className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}

export function TipTapEditor({
  initialContent,
  onUpdate,
  placeholder = "Start writing…",
  imagePathPrefix = "uploads",
  className,
}: TipTapEditorProps) {
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false },
      }),
      TableKit.configure({ table: { resizable: true } }),
      Image.configure({ inline: false }),
      Youtube.configure({ nocookie: true, width: 640, height: 360 }),
      Placeholder.configure({ placeholder }),
      MermaidNode,
    ],
    content: (initialContent as object) ?? undefined,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor }) => {
      onUpdateRef.current(editor.getJSON());
    },
  });

  // Keep the editor alive across renders; destroy on unmount.
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!editor) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-lg border text-sm text-muted-foreground">
        Loading editor…
      </div>
    );
  }

  return (
    <div className={cn("tiptap-editor overflow-hidden rounded-lg border bg-background", className)}>
      <Toolbar editor={editor} imagePathPrefix={imagePathPrefix} />
      <EditorContent editor={editor} />
    </div>
  );
}
