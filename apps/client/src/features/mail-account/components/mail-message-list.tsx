import { useMemo, useState } from "react";
import { ActionIcon, Group, Input, Loader, Text } from "@mantine/core";
import {
  IconChevronLeft,
  IconChevronRight,
  IconInboxOff,
  IconRefresh,
  IconSearch,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { isToday } from "date-fns";
import { useMailMessagesQuery } from "../queries/mail-account-query";
import { formatLocalized, useDateFnsLocale } from "@/lib/date-locale";
import { avatarColor, initials } from "./mail-sidebar";
import classes from "../styles/inbox.module.css";

const PAGE_SIZE = 25;

interface MailMessageListProps {
  selectedUid: number | null;
  onSelect: (uid: number) => void;
}

export function MailMessageList({ selectedUid, onSelect }: MailMessageListProps) {
  const { t } = useTranslation();
  const locale = useDateFnsLocale();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading, isFetching, refetch } = useMailMessagesQuery(
    { page, pageSize: PAGE_SIZE },
    true,
  );

  const allMessages = data?.messages ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const messages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allMessages;
    return allMessages.filter(
      (m) =>
        m.subject.toLowerCase().includes(q) ||
        m.from.toLowerCase().includes(q) ||
        m.fromName.toLowerCase().includes(q),
    );
  }, [allMessages, search]);

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    if (isToday(d)) return formatLocalized(d, "HH:mm", "p", locale);
    return formatLocalized(d, "MMM d", "PP", locale);
  }

  return (
    <div className={classes.listPane}>
      <div className={classes.listHeader}>
        <Text fw={700} size="sm">
          {t("Inbox")}
        </Text>
        <ActionIcon
          variant="subtle"
          c="gray"
          size="sm"
          onClick={() => refetch()}
          loading={isFetching && !isLoading}
          aria-label={t("Refresh")}
        >
          <IconRefresh size={15} />
        </ActionIcon>
      </div>

      <div className={classes.listSearch}>
        <Input
          size="xs"
          leftSection={<IconSearch size={13} />}
          placeholder={t("Search messages…")}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
      </div>

      <div className={classes.listScroll}>
        {isLoading ? (
          <div className={classes.loaderRow}>
            <Loader size="sm" />
          </div>
        ) : messages.length === 0 ? (
          <div className={classes.emptyState}>
            <IconInboxOff size={32} stroke={1.5} />
            <Text size="sm">
              {search ? t("No messages match your search") : t("No messages")}
            </Text>
          </div>
        ) : (
          messages.map((message) => {
            const senderLabel = message.fromName || message.from;
            const bg = avatarColor(message.from || senderLabel);
            const abbr = initials(senderLabel);

            return (
              <div
                key={message.uid}
                className={classes.messageRow}
                data-active={message.uid === selectedUid || undefined}
                onClick={() => onSelect(message.uid)}
              >
                <div
                  className={classes.messageAvatar}
                  style={{ background: bg }}
                >
                  {abbr}
                </div>

                <div className={classes.messageContent}>
                  <div className={classes.messageRowTop}>
                    <Text
                      className={classes.messageFrom}
                      data-unread={!message.seen || undefined}
                    >
                      {senderLabel}
                    </Text>
                    <Text className={classes.messageDate}>
                      {formatDate(message.date)}
                    </Text>
                  </div>

                  <div className={classes.messageSubjectRow}>
                    {!message.seen && <span className={classes.unreadDot} />}
                    <span
                      className={classes.messageSubject}
                      data-unread={!message.seen || undefined}
                    >
                      {message.subject || t("(No subject)")}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className={classes.pagination}>
        <ActionIcon
          variant="subtle"
          c="gray"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          aria-label={t("Previous page")}
        >
          <IconChevronLeft size={15} />
        </ActionIcon>
        <Text size="xs" c="dimmed">
          {page} / {totalPages}
        </Text>
        <ActionIcon
          variant="subtle"
          c="gray"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          aria-label={t("Next page")}
        >
          <IconChevronRight size={15} />
        </ActionIcon>
      </div>
    </div>
  );
}
