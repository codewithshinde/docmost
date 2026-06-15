import { Center, Loader, Text, Title } from "@mantine/core";
import { IconMailOpened } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import DOMPurify from "dompurify";
import { useMailMessageQuery } from "../queries/mail-account-query";
import { formatLocalized, useDateFnsLocale } from "@/lib/date-locale";
import classes from "../styles/inbox.module.css";

interface MailMessageReaderProps {
  uid: number | null;
}

export function MailMessageReader({ uid }: MailMessageReaderProps) {
  const { t } = useTranslation();
  const locale = useDateFnsLocale();
  const { data: message, isLoading } = useMailMessageQuery(uid);

  if (uid === null) {
    return (
      <div className={classes.readerPane}>
        <div className={classes.placeholder}>
          <IconMailOpened size={40} stroke={1.5} />
          <Text fw={600}>{t("Select a message")}</Text>
          <Text size="sm">
            {t("Choose a message from the list to read it.")}
          </Text>
        </div>
      </div>
    );
  }

  if (isLoading || !message) {
    return (
      <div className={classes.readerPane}>
        <Center style={{ height: "100%" }}>
          <Loader size="sm" />
        </Center>
      </div>
    );
  }

  return (
    <div className={classes.readerPane}>
      <div className={classes.readerHeader}>
        <Title order={4}>{message.subject || t("(No subject)")}</Title>
        <Text size="sm" c="dimmed">
          {t("From")}: {message.from}
        </Text>
        <Text size="sm" c="dimmed">
          {t("To")}: {message.to}
        </Text>
        {message.date && (
          <Text size="xs" c="dimmed">
            {formatLocalized(message.date, "PPpp", "PPpp", locale)}
          </Text>
        )}
      </div>
      <div className={classes.readerScroll}>
        {message.html ? (
          <div
            className={classes.readerBody}
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(message.html, {
                ADD_ATTR: ["target"],
              }),
            }}
          />
        ) : (
          <Text className={classes.readerBody} style={{ whiteSpace: "pre-wrap" }}>
            {message.text}
          </Text>
        )}
      </div>
    </div>
  );
}
