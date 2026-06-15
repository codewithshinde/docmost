import { useSetAtom } from "jotai";
import { ActionIcon, Center, Loader, Text, Tooltip } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useMessageQuery, useThreadMessagesQuery } from "../queries/message-query";
import { activeThreadRootIdAtom } from "../atoms/chat-atoms";
import { MessageItem } from "./message-item";
import { MessageComposer } from "./message-composer";
import classes from "./thread-panel.module.css";

const GROUPING_WINDOW_MS = 5 * 60 * 1000;

interface ThreadPanelProps {
  channelId: string;
  currentUserId?: string;
  rootId: string;
  canModerate?: boolean;
}

export function ThreadPanel({
  channelId,
  currentUserId,
  rootId,
  canModerate,
}: ThreadPanelProps) {
  const { t } = useTranslation();
  const setActiveThreadRootId = useSetAtom(activeThreadRootIdAtom);

  const { data: rootMessage, isLoading: isRootLoading } = useMessageQuery(rootId);
  const { data: repliesData, isLoading: isRepliesLoading } = useThreadMessagesQuery(rootId);
  const replies = repliesData?.items ?? [];

  return (
    <div className={classes.panel}>
      <div className={classes.header}>
        <span>{t("Thread")}</span>
        <Tooltip label={t("Close")} withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={() => setActiveThreadRootId(null)}
            aria-label={t("Close thread")}
          >
            <IconX size={16} />
          </ActionIcon>
        </Tooltip>
      </div>

      <div className={classes.scroll}>
        {isRootLoading ? (
          <Center py="md">
            <Loader size="xs" />
          </Center>
        ) : rootMessage ? (
          <div className={classes.rootMessage}>
            <MessageItem
              message={rootMessage}
              channelId={channelId}
              currentUserId={currentUserId}
              showHeader
              canModerate={canModerate}
            />
          </div>
        ) : null}

        <div className={classes.repliesHeader}>
          {isRepliesLoading
            ? t("Loading replies...")
            : t("{{count}} replies", { count: replies.length })}
        </div>

        {replies.map((message, index) => {
          const previous = index > 0 ? replies[index - 1] : null;
          const showHeader =
            !previous ||
            previous.userId !== message.userId ||
            new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() >
              GROUPING_WINDOW_MS;

          return (
            <MessageItem
              key={message.id}
              message={message}
              channelId={channelId}
              currentUserId={currentUserId}
              showHeader={showHeader}
              canModerate={canModerate}
            />
          );
        })}

        {!isRepliesLoading && replies.length === 0 && (
          <Text size="sm" c="dimmed" px="md" py="xs">
            {t("No replies yet.")}
          </Text>
        )}
      </div>

      <MessageComposer
        channelId={channelId}
        rootId={rootId}
        placeholder={t("Reply...")}
      />
    </div>
  );
}
