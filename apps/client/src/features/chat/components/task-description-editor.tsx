import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";
import { ActionIcon, Box, Group, Tooltip } from "@mantine/core";
import {
  IconBold,
  IconItalic,
  IconList,
  IconListNumbers,
  IconH2,
  IconH3,
} from "@tabler/icons-react";

interface TaskDescriptionEditorProps {
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  readOnly?: boolean;
}

export function TaskDescriptionEditor({
  value,
  onChange,
  onBlur,
  placeholder = "Add a description...",
  readOnly = false,
}: TaskDescriptionEditorProps) {
  const initialContent = useRef(value);

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent.current || "",
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
    onBlur: () => {
      onBlur?.();
    },
  });

  // Sync value when task changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      if (value === "" || value === "<p></p>") {
        editor.commands.clearContent();
      } else {
        editor.commands.setContent(value);
      }
    }
  }, [value]);

  if (!editor) return null;

  const isEmpty =
    editor.isEmpty || editor.getHTML() === "<p></p>";

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
        <Group
          gap={2}
          px="xs"
          py={4}
          style={{
            borderBottom: "1px solid var(--mantine-color-default-border)",
            background: "var(--mantine-color-default-hover)",
          }}
        >
          <Tooltip label="Bold" withArrow>
            <ActionIcon
              size="xs"
              variant={editor.isActive("bold") ? "filled" : "subtle"}
              color={editor.isActive("bold") ? "blue" : "gray"}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <IconBold size={12} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Italic" withArrow>
            <ActionIcon
              size="xs"
              variant={editor.isActive("italic") ? "filled" : "subtle"}
              color={editor.isActive("italic") ? "blue" : "gray"}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <IconItalic size={12} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Heading 2" withArrow>
            <ActionIcon
              size="xs"
              variant={editor.isActive("heading", { level: 2 }) ? "filled" : "subtle"}
              color={editor.isActive("heading", { level: 2 }) ? "blue" : "gray"}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <IconH2 size={12} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Heading 3" withArrow>
            <ActionIcon
              size="xs"
              variant={editor.isActive("heading", { level: 3 }) ? "filled" : "subtle"}
              color={editor.isActive("heading", { level: 3 }) ? "blue" : "gray"}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
              <IconH3 size={12} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Bullet list" withArrow>
            <ActionIcon
              size="xs"
              variant={editor.isActive("bulletList") ? "filled" : "subtle"}
              color={editor.isActive("bulletList") ? "blue" : "gray"}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <IconList size={12} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Numbered list" withArrow>
            <ActionIcon
              size="xs"
              variant={editor.isActive("orderedList") ? "filled" : "subtle"}
              color={editor.isActive("orderedList") ? "blue" : "gray"}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <IconListNumbers size={12} />
            </ActionIcon>
          </Tooltip>
        </Group>
      )}
      <Box
        style={{ position: "relative", minHeight: readOnly ? undefined : 120 }}
        px="xs"
        py="xs"
      >
        {isEmpty && !editor.isFocused && (
          <Box
            style={{
              position: "absolute",
              top: 8,
              left: 12,
              pointerEvents: "none",
              color: "var(--mantine-color-dimmed)",
              fontSize: 14,
            }}
          >
            {placeholder}
          </Box>
        )}
        <EditorContent
          editor={editor}
          style={{
            outline: "none",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        />
      </Box>
    </Box>
  );
}
