import { useState } from "react";
import { ActionIcon, Text, Textarea, Tooltip } from "@mantine/core";
import { IconEdit, IconMessageCircle2, IconTrash, IconX, IconCheck } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { modals } from "@mantine/modals";
import { useSetAtom } from "jotai";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import { IMessage } from "../types/chat.types";
import { useDeleteMessageMutation, useUpdateMessageMutation } from "../queries/message-query";
import { useAddReactionMutation, useRemoveReactionMutation } from "../queries/reaction-query";
import { activeThreadRootIdAtom } from "../atoms/chat-atoms";
import { ReactionPicker } from "./reaction-picker";
import { MessageAttachment } from "./message-attachment";
import { renderMessageContent } from "../utils/message-content";
import classes from "./message-item.module.css";

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

interface MessageItemProps {
  message: IMessage;
  channelId: string;
  currentUserId?: string;
  showHeader: boolean;
  canModerate?: boolean;
}

export function MessageItem({
  message,
  channelId,
  currentUserId,
  showHeader,
  canModerate,
}: MessageItemProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content ?? "");
  const setActiveThreadRootId = useSetAtom(activeThreadRootIdAtom);

  const updateMessageMutation = useUpdateMessageMutation();
  const deleteMessageMutation = useDeleteMessageMutation();
  const addReactionMutation = useAddReactionMutation();
  const removeReactionMutation = useRemoveReactionMutation();

  const isOwn = message.userId === currentUserId;
  const isDeleted = !!message.deletedAt;
  const canEdit = isOwn && !isDeleted;
  const canDelete = (isOwn || canModerate) && !isDeleted;
  const canReply = !message.rootId && !isDeleted;

  const handleSaveEdit = () => {
    const content = editValue.trim();
    if (!content || content === message.content) {
      setIsEditing(false);
      setEditValue(message.content ?? "");
      return;
    }
    updateMessageMutation.mutate(
      { messageId: message.id, content },
      { onSuccess: () => setIsEditing(false) },
    );
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditValue(message.content ?? "");
  };

  const handleDelete = () => {
    modals.openConfirmModal({
      title: t("Delete message"),
      centered: true,
      children: <Text size="sm">{t("Are you sure you want to delete this message?")}</Text>,
      labels: { confirm: t("Delete"), cancel: t("Cancel") },
      confirmProps: { color: "red" },
      onConfirm: () => deleteMessageMutation.mutate(message.id),
    });
  };

  const handleReactionClick = (emoji: string, hasReacted: boolean) => {
    if (hasReacted) {
      removeReactionMutation.mutate({ messageId: message.id, emoji, channelId });
    } else {
      addReactionMutation.mutate({ messageId: message.id, emoji, channelId });
    }
  };

  const handleAddReaction = (emoji: string) => {
    addReactionMutation.mutate({ messageId: message.id, emoji, channelId });
  };

  const reactionGroups = (message.reactions ?? []).reduce<
    Record<string, { count: number; reacted: boolean }>
  >((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = { count: 0, reacted: false };
    }
    acc[reaction.emoji].count += 1;
    if (reaction.userId === currentUserId) {
      acc[reaction.emoji].reacted = true;
    }
    return acc;
  }, {});

  return (
    <div
      className={`${classes.messageRow} ${showHeader ? "" : classes.messageRowGrouped}`}
    >
      {showHeader ? (
        <div className={classes.avatarColumn}>
          <CustomAvatar
            avatarUrl={message.user?.avatarUrl}
            name={message.user?.name ?? "?"}
            size={36}
            radius="md"
          />
        </div>
      ) : (
        <div className={classes.hoverTime}>{formatTime(message.createdAt)}</div>
      )}

      <div className={classes.content}>
        {showHeader && (
          <div className={classes.headerLine}>
            <Text className={classes.authorName}>
              {message.user?.name ?? t("Unknown user")}
            </Text>
            <span className={classes.timestamp}>{formatTime(message.createdAt)}</span>
          </div>
        )}

        {isDeleted ? (
          <Text className={classes.deletedBody}>{t("This message was deleted")}</Text>
        ) : isEditing ? (
          <div className={classes.editArea}>
            <Textarea
              value={editValue}
              onChange={(event) => setEditValue(event.currentTarget.value)}
              autosize
              minRows={1}
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSaveEdit();
                } else if (event.key === "Escape") {
                  handleCancelEdit();
                }
              }}
            />
            <Text size="xs" c="dimmed" mt={4}>
              {t("escape to cancel, enter to save")}
            </Text>
          </div>
        ) : (
          <div className={classes.body}>
            {renderMessageContent(message.content, classes.mention)}
            {message.editedAt && <span className={classes.editedTag}>({t("edited")})</span>}
          </div>
        )}

        {!isDeleted && message.attachments && message.attachments.length > 0 && (
          <div className={classes.attachments}>
            {message.attachments.map((attachment) => (
              <MessageAttachment key={attachment.id} attachment={attachment} />
            ))}
          </div>
        )}

        {!isDeleted && Object.keys(reactionGroups).length > 0 && (
          <div className={classes.reactions}>
            {Object.entries(reactionGroups).map(([emoji, group]) => (
              <div
                key={emoji}
                className={classes.reactionPill}
                data-active={group.reacted || undefined}
                onClick={() => handleReactionClick(emoji, group.reacted)}
              >
                <span>{emoji}</span>
                <span>{group.count}</span>
              </div>
            ))}
          </div>
        )}

        {!message.rootId && message.replyCount > 0 && (
          <div
            className={classes.replyLink}
            onClick={() => setActiveThreadRootId(message.id)}
          >
            <IconMessageCircle2 size={14} />
            {t("{{count}} replies", { count: message.replyCount })}
          </div>
        )}
      </div>

      {!isDeleted && !isEditing && (
        <div className={classes.toolbar}>
          <ReactionPicker onSelect={handleAddReaction} />
          {canReply && (
            <Tooltip label={t("Reply in thread")} withArrow>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                onClick={() => setActiveThreadRootId(message.id)}
                aria-label={t("Reply in thread")}
              >
                <IconMessageCircle2 size={16} />
              </ActionIcon>
            </Tooltip>
          )}
          {canEdit && (
            <Tooltip label={t("Edit")} withArrow>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                onClick={() => setIsEditing(true)}
                aria-label={t("Edit message")}
              >
                <IconEdit size={16} />
              </ActionIcon>
            </Tooltip>
          )}
          {canDelete && (
            <Tooltip label={t("Delete")} withArrow>
              <ActionIcon
                variant="subtle"
                color="red"
                size="sm"
                onClick={handleDelete}
                aria-label={t("Delete message")}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          )}
        </div>
      )}

      {isEditing && (
        <div className={classes.toolbar}>
          <Tooltip label={t("Save")} withArrow>
            <ActionIcon variant="subtle" color="green" size="sm" onClick={handleSaveEdit} aria-label={t("Save")}>
              <IconCheck size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t("Cancel")} withArrow>
            <ActionIcon variant="subtle" color="gray" size="sm" onClick={handleCancelEdit} aria-label={t("Cancel")}>
              <IconX size={16} />
            </ActionIcon>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
