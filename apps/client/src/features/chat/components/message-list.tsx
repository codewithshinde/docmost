import { useEffect, useMemo, useRef } from "react";
import { Center, Loader, Text } from "@mantine/core";
import { isToday, isYesterday } from "date-fns";
import { useTranslation } from "react-i18next";
import { formatLocalized, getDateFnsLocale } from "@/lib/date-locale";
import { useChannelMessagesQuery } from "../queries/message-query";
import { useMarkChannelReadMutation } from "../queries/channel-query";
import { MessageItem } from "./message-item";
import classes from "./message-list.module.css";

const GROUPING_WINDOW_MS = 5 * 60 * 1000;

function dateSeparatorLabel(date: Date) {
  const locale = getDateFnsLocale();
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return formatLocalized(date, "MMMM d, yyyy", "PPP", locale);
}

interface MessageListProps {
  channelId: string;
  currentUserId?: string;
  canModerate?: boolean;
  initialLastReadMessageId?: string | null;
}

export function MessageList({
  channelId,
  currentUserId,
  canModerate,
  initialLastReadMessageId,
}: MessageListProps) {
  const { t } = useTranslation();
  const query = useChannelMessagesQuery(channelId);
  const markReadMutation = useMarkChannelReadMutation();

  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const unreadDividerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const lastMessageIdRef = useRef<string | null>(null);
  const lastReadMessageIdRef = useRef<string | null>(null);
  // captured once when the channel opens, before we mark it read, so the
  // "new messages" divider stays anchored where the user left off.
  const unreadAnchorRef = useRef<string | null | undefined>(undefined);
  const propAnchorRef = useRef<string | null | undefined>(initialLastReadMessageId);
  propAnchorRef.current = initialLastReadMessageId;

  const messages = useMemo(() => {
    const pages = query.data?.pages ?? [];
    const flat = pages.flatMap((page) => page.items);
    return [...flat].reverse();
  }, [query.data]);

  const firstUnreadId = useMemo(() => {
    const anchor = unreadAnchorRef.current;
    if (!anchor) return null;
    const anchorIndex = messages.findIndex((m) => m.id === anchor);
    if (anchorIndex < 0 || anchorIndex >= messages.length - 1) return null;
    return messages[anchorIndex + 1].id;
    // unreadAnchorRef is a ref captured at load; recompute when messages change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, channelId]);

  // reset per-channel scroll/read tracking
  useEffect(() => {
    lastMessageIdRef.current = null;
    lastReadMessageIdRef.current = null;
    unreadAnchorRef.current = undefined;
    isNearBottomRef.current = true;
  }, [channelId]);

  // track whether the user is scrolled near the bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      isNearBottomRef.current =
        el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // load older messages when the top sentinel comes into view
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && query.hasNextPage && !query.isFetchingNextPage) {
          query.fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  // scroll to bottom on initial load / new messages, and mark channel as read
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    const isInitialLoad = lastMessageIdRef.current === null;
    const isNewMessage =
      !isInitialLoad && lastMessage.id !== lastMessageIdRef.current;
    lastMessageIdRef.current = lastMessage.id;

    if (isInitialLoad) {
      // capture the unread boundary once, before markRead runs
      unreadAnchorRef.current = propAnchorRef.current ?? null;
      const anchor = unreadAnchorRef.current;
      const anchorIndex = anchor
        ? messages.findIndex((m) => m.id === anchor)
        : -1;
      const hasUnread =
        anchor !== null && anchorIndex >= 0 && anchorIndex < messages.length - 1;

      requestAnimationFrame(() => {
        if (hasUnread && unreadDividerRef.current) {
          unreadDividerRef.current.scrollIntoView({ block: "center" });
        } else {
          bottomRef.current?.scrollIntoView({ block: "end" });
        }
      });
    } else if (isNewMessage && isNearBottomRef.current) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ block: "end" });
      });
    }

    if (
      (isInitialLoad || isNewMessage) &&
      lastReadMessageIdRef.current !== lastMessage.id
    ) {
      lastReadMessageIdRef.current = lastMessage.id;
      markReadMutation.mutate({ channelId, messageId: lastMessage.id });
    }
  }, [messages, channelId]);

  if (query.isLoading) {
    return (
      <Center style={{ flex: 1 }}>
        <Loader size="sm" />
      </Center>
    );
  }

  if (messages.length === 0) {
    return (
      <div className={classes.list}>
        <div className={classes.emptyState}>
          <Text fw={600}>{t("No messages yet")}</Text>
          <Text size="sm">{t("Send the first message to start the conversation.")}</Text>
        </div>
      </div>
    );
  }

  return (
    <div className={classes.list} ref={scrollRef}>
      <div ref={topSentinelRef} />
      {query.isFetchingNextPage && (
        <div className={classes.loaderRow}>
          <Loader size="xs" />
        </div>
      )}
      <div className={classes.spacer} />
      {messages.map((message, index) => {
        const previous = index > 0 ? messages[index - 1] : null;
        const currentDate = new Date(message.createdAt);
        const showDateSeparator =
          !previous || new Date(previous.createdAt).toDateString() !== currentDate.toDateString();

        const showHeader =
          showDateSeparator ||
          !previous ||
          previous.userId !== message.userId ||
          currentDate.getTime() - new Date(previous.createdAt).getTime() > GROUPING_WINDOW_MS;

        return (
          <div key={message.id}>
            {firstUnreadId === message.id && (
              <div className={classes.unreadDivider} ref={unreadDividerRef}>
                {t("New messages")}
              </div>
            )}
            {showDateSeparator && (
              <div className={classes.dateSeparator}>
                {dateSeparatorLabel(currentDate)}
              </div>
            )}
            <MessageItem
              message={message}
              channelId={channelId}
              currentUserId={currentUserId}
              showHeader={showHeader}
              canModerate={canModerate}
            />
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
