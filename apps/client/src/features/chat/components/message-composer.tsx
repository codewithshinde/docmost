import { useMemo, useRef, useState } from "react";
import { ActionIcon, Loader, Text, Textarea, Tooltip } from "@mantine/core";
import { IconPaperclip, IconSend, IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useAtomValue } from "jotai";
import { socketAtom } from "@/features/websocket/atoms/socket-atom";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import { useChannelMembersQuery } from "../queries/channel-query";
import { useSendMessageMutation } from "../queries/message-query";
import { uploadChatAttachment } from "../services/message-service";
import { extractMentionUserIds } from "../utils/message-content";
import classes from "./message-composer.module.css";

interface PendingAttachment {
  key: string;
  fileName: string;
  attachmentId?: string;
  uploading: boolean;
  error?: boolean;
}

interface MessageComposerProps {
  channelId: string;
  rootId?: string;
  placeholder?: string;
  onSent?: () => void;
}

const MENTION_TRIGGER_REGEX = /@([\p{L}\p{N}_.-]*)$/u;

export function MessageComposer({
  channelId,
  rootId,
  placeholder,
  onSent,
}: MessageComposerProps) {
  const { t } = useTranslation();
  const socket = useAtomValue(socketAtom);
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingStateRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const { data: members } = useChannelMembersQuery(channelId);
  const sendMessageMutation = useSendMessageMutation();

  const mentionCandidates = useMemo(() => {
    if (mentionQuery === null) return [];
    const query = mentionQuery.toLowerCase();
    return (members ?? [])
      .filter((member) => member.user?.name?.toLowerCase().includes(query))
      .slice(0, 6);
  }, [members, mentionQuery]);

  const sendTyping = (isTyping: boolean) => {
    if (!socket) return;
    if (typingStateRef.current === isTyping) return;
    typingStateRef.current = isTyping;
    socket.emit("chat.typing", { channelId, isTyping });
  };

  const handleChange = (value: string) => {
    setContent(value);

    sendTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendTyping(false), 3000);

    const cursor = textareaRef.current?.selectionStart ?? value.length;
    const textBeforeCursor = value.slice(0, cursor);
    const match = textBeforeCursor.match(MENTION_TRIGGER_REGEX);
    if (match) {
      setMentionQuery(match[1]);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (userId: string, name: string) => {
    const textarea = textareaRef.current;
    const cursor = textarea?.selectionStart ?? content.length;
    const textBeforeCursor = content.slice(0, cursor);
    const match = textBeforeCursor.match(MENTION_TRIGGER_REGEX);
    if (!match) return;

    const mentionText = `@[${name}](${userId}) `;
    const newContent =
      content.slice(0, match.index) + mentionText + content.slice(cursor);

    setContent(newContent);
    setMentionQuery(null);

    requestAnimationFrame(() => {
      if (textarea) {
        const newCursor = match.index + mentionText.length;
        textarea.focus();
        textarea.setSelectionRange(newCursor, newCursor);
      }
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && mentionCandidates.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setMentionIndex((prev) => (prev + 1) % mentionCandidates.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setMentionIndex(
          (prev) => (prev - 1 + mentionCandidates.length) % mentionCandidates.length,
        );
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        const candidate = mentionCandidates[mentionIndex];
        if (candidate?.user) {
          insertMention(candidate.userId, candidate.user.name);
        }
        return;
      }
      if (event.key === "Escape") {
        setMentionQuery(null);
        return;
      }
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    for (const file of files) {
      const key = `${file.name}-${Date.now()}-${Math.random()}`;
      setAttachments((prev) => [
        ...prev,
        { key, fileName: file.name, uploading: true },
      ]);

      try {
        const uploaded = await uploadChatAttachment(file, channelId);
        setAttachments((prev) =>
          prev.map((att) =>
            att.key === key
              ? { ...att, uploading: false, attachmentId: uploaded.id }
              : att,
          ),
        );
      } catch {
        setAttachments((prev) =>
          prev.map((att) =>
            att.key === key ? { ...att, uploading: false, error: true } : att,
          ),
        );
      }
    }
  };

  const removeAttachment = (key: string) => {
    setAttachments((prev) => prev.filter((att) => att.key !== key));
  };

  const handleSend = () => {
    const trimmed = content.trim();
    const readyAttachments = attachments.filter((att) => att.attachmentId);
    const isUploading = attachments.some((att) => att.uploading);

    if (isUploading) return;
    if (!trimmed && readyAttachments.length === 0) return;

    sendTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    sendMessageMutation.mutate(
      {
        channelId,
        content: trimmed || undefined,
        rootId,
        attachmentIds: readyAttachments.map((att) => att.attachmentId!),
        mentionUserIds: extractMentionUserIds(trimmed),
      },
      {
        onSuccess: () => {
          setContent("");
          setAttachments([]);
          onSent?.();
        },
      },
    );
  };

  return (
    <div className={classes.composer}>
      {attachments.length > 0 && (
        <div className={classes.attachmentsRow}>
          {attachments.map((att) => (
            <div key={att.key} className={classes.attachmentChip}>
              {att.uploading && <Loader size={12} />}
              <span className={classes.attachmentChipName} title={att.fileName}>
                {att.fileName}
              </span>
              {att.error && <Text size="xs" c="red">{t("Failed")}</Text>}
              <ActionIcon
                size="xs"
                variant="subtle"
                color="gray"
                onClick={() => removeAttachment(att.key)}
                aria-label={t("Remove attachment")}
              >
                <IconX size={12} />
              </ActionIcon>
            </div>
          ))}
        </div>
      )}

      <div className={classes.inputWrapper}>
        {mentionQuery !== null && mentionCandidates.length > 0 && (
          <div className={classes.mentionDropdown}>
            {mentionCandidates.map((member, index) => (
              <div
                key={member.userId}
                className={classes.mentionItem}
                data-active={index === mentionIndex || undefined}
                onMouseDown={(event) => {
                  event.preventDefault();
                  if (member.user) insertMention(member.userId, member.user.name);
                }}
              >
                <CustomAvatar
                  avatarUrl={member.user?.avatarUrl}
                  name={member.user?.name ?? "?"}
                  size={20}
                  radius="xl"
                />
                <span>{member.user?.name}</span>
              </div>
            ))}
          </div>
        )}

        <Tooltip label={t("Attach file")} withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={() => fileInputRef.current?.click()}
            aria-label={t("Attach file")}
          >
            <IconPaperclip size={18} />
          </ActionIcon>
        </Tooltip>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />

        <Textarea
          ref={textareaRef}
          className={classes.textarea}
          variant="unstyled"
          placeholder={placeholder ?? t("Message...")}
          value={content}
          onChange={(event) => handleChange(event.currentTarget.value)}
          onKeyDown={handleKeyDown}
          autosize
          minRows={1}
          maxRows={8}
        />

        <Tooltip label={t("Send")} withArrow>
          <ActionIcon
            variant="filled"
            onClick={handleSend}
            disabled={sendMessageMutation.isPending}
            aria-label={t("Send message")}
          >
            <IconSend size={16} />
          </ActionIcon>
        </Tooltip>
      </div>
    </div>
  );
}
