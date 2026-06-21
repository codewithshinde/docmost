import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef } from "react";
import { ActionIcon, Box, Divider, Group, Tooltip } from "@mantine/core";
import {
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconBlockquote,
  IconBold,
  IconCode,
  IconH1,
  IconH2,
  IconH3,
  IconHighlight,
  IconItalic,
  IconStrikethrough,
  IconLink,
  IconList,
  IconListNumbers,
  IconMinus,
  IconSourceCode,
  IconUnderline,
} from "@tabler/icons-react";

interface TaskDescriptionEditorProps {
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: number;
}

export function TaskDescriptionEditor({
  value,
  onChange,
  onBlur,
  placeholder = "Add a description... Use the toolbar for rich formatting.",
  readOnly = false,
  minHeight = 220,
}: TaskDescriptionEditorProps) {
  const initialContent = useRef(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { languageClassPrefix: "language-" },
      }),
      Underline,
      Highlight.configure({ multicolor: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: initialContent.current || "",
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
    onBlur: () => onBlur?.(),
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const incoming = value || "";
    if (incoming !== current && incoming !== (current === "<p></p>" ? "" : current)) {
      if (!incoming) {
        editor.commands.clearContent();
      } else {
        editor.commands.setContent(incoming);
      }
    }
  }, [editor, value]);

  if (!editor) return null;

  const ToolBtn = ({
    label,
    active,
    onClick,
    children,
  }: {
    label: string;
    active?: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <Tooltip label={label} withArrow openDelay={400}>
      <ActionIcon
        size="sm"
        variant={active ? "filled" : "subtle"}
        color={active ? "blue" : "gray"}
        onClick={onClick}
      >
        {children}
      </ActionIcon>
    </Tooltip>
  );

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  };

  return (
    <Box
      style={{
        border: "1px solid var(--mantine-color-default-border)",
        borderRadius: 6,
        background: "var(--mantine-color-body)",
        overflow: "hidden",
      }}
    >
      {!readOnly && (
        <Box
          px="sm"
          py={8}
          style={{
            borderBottom: "1px solid var(--mantine-color-default-border)",
            background: "var(--mantine-color-default-hover)",
          }}
        >
          <Group gap={2} wrap="wrap">
            {/* Formatting */}
            <ToolBtn label="Bold (⌘B)" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
              <IconBold size={16} />
            </ToolBtn>
            <ToolBtn label="Italic (⌘I)" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
              <IconItalic size={16} />
            </ToolBtn>
            <ToolBtn label="Underline (⌘U)" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
              <IconUnderline size={16} />
            </ToolBtn>
            <ToolBtn label="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
              <IconStrikethrough size={16} />
            </ToolBtn>
            <ToolBtn label="Highlight" active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()}>
              <IconHighlight size={16} />
            </ToolBtn>
            <ToolBtn label="Inline code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
              <IconCode size={16} />
            </ToolBtn>
            <ToolBtn label="Link" active={editor.isActive("link")} onClick={setLink}>
              <IconLink size={16} />
            </ToolBtn>

            <Divider orientation="vertical" my={2} />

            {/* Headings */}
            <ToolBtn label="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
              <IconH1 size={16} />
            </ToolBtn>
            <ToolBtn label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              <IconH2 size={16} />
            </ToolBtn>
            <ToolBtn label="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
              <IconH3 size={16} />
            </ToolBtn>

            <Divider orientation="vertical" my={2} />

            {/* Lists */}
            <ToolBtn label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
              <IconList size={16} />
            </ToolBtn>
            <ToolBtn label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
              <IconListNumbers size={16} />
            </ToolBtn>

            <Divider orientation="vertical" my={2} />

            {/* Blocks */}
            <ToolBtn label="Blockquote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
              <IconBlockquote size={16} />
            </ToolBtn>
            <ToolBtn label="Code block" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
              <IconSourceCode size={16} />
            </ToolBtn>
            <ToolBtn label="Divider" active={false} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
              <IconMinus size={16} />
            </ToolBtn>

            <Divider orientation="vertical" my={2} />

            {/* Alignment */}
            <ToolBtn label="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
              <IconAlignLeft size={16} />
            </ToolBtn>
            <ToolBtn label="Align center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
              <IconAlignCenter size={16} />
            </ToolBtn>
            <ToolBtn label="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
              <IconAlignRight size={16} />
            </ToolBtn>
          </Group>
        </Box>
      )}

      <Box
        style={{ minHeight: readOnly ? 72 : minHeight, position: "relative" }}
        px={readOnly ? "sm" : "md"}
        py={readOnly ? "sm" : "md"}
        className="task-rich-editor"
      >
        <EditorContent
          editor={editor}
          style={{ outline: "none", fontSize: 15, lineHeight: 1.75 }}
        />
      </Box>

      <style>{`
        .task-rich-editor .tiptap { outline: none; padding: 0; }
        .task-rich-editor .tiptap p { margin: 0 0 8px; }
        .task-rich-editor .tiptap p:last-child { margin-bottom: 0; }
        .task-rich-editor .tiptap h1 { font-size: 22px; font-weight: 700; margin: 12px 0 6px; }
        .task-rich-editor .tiptap h2 { font-size: 18px; font-weight: 700; margin: 10px 0 4px; }
        .task-rich-editor .tiptap h3 { font-size: 15px; font-weight: 700; margin: 8px 0 4px; }
        .task-rich-editor .tiptap ul, .task-rich-editor .tiptap ol { padding-left: 20px; margin: 6px 0; }
        .task-rich-editor .tiptap li { margin: 2px 0; }
        .task-rich-editor .tiptap blockquote { border-left: 3px solid var(--mantine-color-blue-4); padding-left: 12px; margin: 8px 0; color: var(--mantine-color-dimmed); }
        .task-rich-editor .tiptap code { background: var(--mantine-color-gray-1); padding: 2px 5px; border-radius: 3px; font-size: 12px; font-family: monospace; }
        .task-rich-editor .tiptap pre { background: var(--mantine-color-dark-8); color: var(--mantine-color-gray-1); padding: 12px; border-radius: 6px; overflow-x: auto; margin: 8px 0; }
        .task-rich-editor .tiptap pre code { background: none; padding: 0; font-size: 13px; }
        .task-rich-editor .tiptap hr { border: none; border-top: 2px solid var(--mantine-color-default-border); margin: 12px 0; }
        .task-rich-editor .tiptap a { color: var(--mantine-color-blue-6); text-decoration: underline; }
        .task-rich-editor .tiptap mark { background: var(--mantine-color-yellow-2); border-radius: 2px; padding: 0 2px; }
        .task-rich-editor .tiptap .is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: var(--mantine-color-dimmed); pointer-events: none; height: 0; }
      `}</style>
    </Box>
  );
}
