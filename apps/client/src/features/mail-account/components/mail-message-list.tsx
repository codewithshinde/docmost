import { useState } from "react";
import { ActionIcon, Button, Group, Loader, Text } from "@mantine/core";
import {
  IconChevronLeft,
  IconChevronRight,
  IconInboxOff,
  IconPencilPlus,
  IconRefresh,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useMailMessagesQuery } from "../queries/mail-account-query";
import { formatLocalized, useDateFnsLocale } from "@/lib/date-locale";
import classes from "../styles/inbox.module.css";

const PAGE_SIZE = 25;

interface MailMessageListProps {
  selectedUid: number | null;
  onSelect: (uid: number) => void;
  onCompose: () => void;
}

export function MailMessageList({
  selectedUid,
  onSelect,
  onCompose,
}: MailMessageListProps) {
  const { t } = useTranslation();
  const locale = useDateFnsLocale();
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, refetch } = useMailMessagesQuery(
    { page, pageSize: PAGE_SIZE },
    true,
  );

  const messages = data?.messages ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className={classes.listPane}>
      <div className={classes.listHeader}>
        <Text fw={700} size="sm">
          {t("Inbox")}
        </Text>
        <Group gap="xs" wrap="nowrap">
          <Button
            variant="light"
            size="xs"
            leftSection={<IconPencilPlus size={14} />}
            onClick={onCompose}
          >
            {t("Compose")}
          </Button>
          <ActionIcon
            variant="subtle"
            c="gray"
            onClick={() => refetch()}
            loading={isFetching && !isLoading}
            aria-label={t("Refresh")}
          >
            <IconRefresh size={16} />
          </ActionIcon>
        </Group>
      </div>

      <div className={classes.listScroll}>
        {isLoading ? (
          <div className={classes.loaderRow}>
            <Loader size="sm" />
          </div>
        ) : messages.length === 0 ? (
          <div className={classes.emptyState}>
            <IconInboxOff size={32} stroke={1.5} />
            <Text size="sm">{t("No messages")}</Text>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.uid}
              className={classes.messageRow}
              data-active={message.uid === selectedUid || undefined}
              onClick={() => onSelect(message.uid)}
            >
              <div className={classes.messageRowTop}>
                <Text
                  className={classes.messageFrom}
                  data-unread={!message.seen || undefined}
                >
                  {message.fromName || message.from}
                </Text>
                {message.date && (
                  <Text className={classes.messageDate}>
                    {formatLocalized(message.date, "MMM d", "PP", locale)}
                  </Text>
                )}
              </div>
              <Text
                className={classes.messageSubject}
                data-unread={!message.seen || undefined}
              >
                {message.subject || t("(No subject)")}
              </Text>
            </div>
          ))
        )}
      </div>

      <div className={classes.pagination}>
        <ActionIcon
          variant="subtle"
          c="gray"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          aria-label={t("Previous page")}
        >
          <IconChevronLeft size={16} />
        </ActionIcon>
        <Text size="xs" c="dimmed">
          {t("Page")} {page} / {totalPages}
        </Text>
        <ActionIcon
          variant="subtle"
          c="gray"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          aria-label={t("Next page")}
        >
          <IconChevronRight size={16} />
        </ActionIcon>
      </div>
    </div>
  );
}
