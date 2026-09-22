"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading2, Italic, List, Link2 } from "lucide-react";

export function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: "blog-content min-h-[240px] outline-none px-4 py-3" },
    },
  });

  if (!editor) return null;

  const buttonClass = (active: boolean) => `rounded p-1.5 ${active ? "bg-ink-900 text-white" : "text-ink-900/60 hover:bg-ink-900/5"}`;

  return (
    <div className="rounded-xl border border-ink-900/12 bg-white">
      <div className="flex items-center gap-1 border-b border-ink-900/8 p-2">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={buttonClass(editor.isActive("bold"))}>
          <Bold size={14} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={buttonClass(editor.isActive("italic"))}>
          <Italic size={14} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={buttonClass(editor.isActive("heading", { level: 2 }))}>
          <Heading2 size={14} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={buttonClass(editor.isActive("bulletList"))}>
          <List size={14} />
        </button>
        <button
          type="button"
          onClick={() => {
            const url = window.prompt("Link URL");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          className={buttonClass(editor.isActive("link"))}
        >
          <Link2 size={14} />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
