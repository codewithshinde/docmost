import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button, Center, Loader, Text } from "@mantine/core";
import { IconMail, IconSettings } from "@tabler/icons-react";
import { getAppName } from "@/lib/config.ts";
import { useMailAccountQuery } from "@/features/mail-account/queries/mail-account-query";
import { MailMessageList } from "@/features/mail-account/components/mail-message-list";
import { MailMessageReader } from "@/features/mail-account/components/mail-message-reader";
import classes from "@/features/mail-account/styles/inbox.module.css";

export default function Inbox() {
  const { t } = useTranslation();
  const { data: account, isLoading } = useMailAccountQuery();
  const [selectedUid, setSelectedUid] = useState<number | null>(null);

  return (
    <div className={classes.page}>
      <Helmet>
        <title>
          {t("Mail")} - {getAppName()}
        </title>
      </Helmet>

      {isLoading ? (
        <Center style={{ height: "100%", width: "100%" }}>
          <Loader size="sm" />
        </Center>
      ) : !account?.configured ? (
        <div className={classes.placeholder}>
          <IconMail size={40} stroke={1.5} />
          <Text fw={600}>{t("No email account connected")}</Text>
          <Text size="sm">
            {t(
              "Connect your mailbox to read your email inside this app.",
            )}
          </Text>
          <Button
            component={Link}
            to="/settings/account/email"
            leftSection={<IconSettings size={16} />}
          >
            {t("Connect email account")}
          </Button>
        </div>
      ) : (
        <>
          <MailMessageList
            selectedUid={selectedUid}
            onSelect={setSelectedUid}
          />
          <MailMessageReader uid={selectedUid} />
        </>
      )}
    </div>
  );
}
