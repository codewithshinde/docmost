import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  NumberInput,
  PasswordInput,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { IconInfoCircle, IconMail } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { getAppName } from "@/lib/config.ts";
import SettingsTitle from "@/components/settings/settings-title.tsx";
import {
  useDeleteMailAccountMutation,
  useMailAccountQuery,
  useSaveMailAccountMutation,
} from "@/features/mail-account/queries/mail-account-query";
import { testMailAccount } from "@/features/mail-account/services/mail-account-service";

const SECRET_PLACEHOLDER = "••••••••  (leave blank to keep)";

export default function EmailSettings() {
  const { t } = useTranslation();
  const { data: account, isLoading } = useMailAccountQuery();
  const saveMutation = useSaveMailAccountMutation();
  const deleteMutation = useDeleteMailAccountMutation();
  const [testing, setTesting] = useState(false);

  const [emailAddress, setEmailAddress] = useState("");
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState<number | string>(993);
  const [imapSecure, setImapSecure] = useState(true);
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState<number | string>(587);
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!account) return;
    setEmailAddress(account.emailAddress ?? "");
    setImapHost(account.imapHost ?? "");
    setImapPort(account.imapPort ?? 993);
    setImapSecure(account.imapSecure ?? true);
    setSmtpHost(account.smtpHost ?? "");
    setSmtpPort(account.smtpPort ?? 587);
    setSmtpSecure(account.smtpSecure ?? true);
    setUsername(account.username ?? "");
  }, [account]);

  const handleSave = () => {
    saveMutation.mutate({
      emailAddress,
      imapHost,
      imapPort: Number(imapPort),
      imapSecure,
      smtpHost: smtpHost || undefined,
      smtpPort: smtpPort ? Number(smtpPort) : undefined,
      smtpSecure,
      username: username || undefined,
      ...(password ? { password } : {}),
    });
    setPassword("");
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await testMailAccount();
      notifications.show({
        message: result.message,
        color: result.ok ? "green" : "red",
      });
    } catch (err: any) {
      notifications.show({
        message: err?.response?.data?.message ?? t("Connection test failed"),
        color: "red",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = () => {
    modals.openConfirmModal({
      title: t("Disconnect email account"),
      children: (
        <Text size="sm">
          {t(
            "Are you sure you want to disconnect this email account? Your inbox will no longer be accessible from this app.",
          )}
        </Text>
      ),
      labels: { confirm: t("Disconnect"), cancel: t("Cancel") },
      confirmProps: { color: "red" },
      onConfirm: () => {
        deleteMutation.mutate();
        setEmailAddress("");
        setImapHost("");
        setImapPort(993);
        setImapSecure(true);
        setSmtpHost("");
        setSmtpPort(587);
        setSmtpSecure(true);
        setUsername("");
        setPassword("");
      },
    });
  };

  return (
    <>
      <Helmet>
        <title>
          {t("Email")} - {getAppName()}
        </title>
      </Helmet>
      <SettingsTitle title={t("Email")} />

      <Stack gap="md">
        <Card withBorder radius="md" p="lg">
          <Group justify="space-between" mb="xs">
            <Group gap="xs">
              <IconMail size={18} />
              <Text fw={600}>{t("Personal email account")}</Text>
            </Group>
            {account?.configured ? (
              <Badge color="green" variant="light">
                {t("Connected")}
              </Badge>
            ) : (
              <Badge color="gray" variant="light">
                {t("Not connected")}
              </Badge>
            )}
          </Group>

          <Text size="sm" c="dimmed" mb="md">
            {t(
              "Connect your mailbox via IMAP to read your email inside this app. Credentials are stored encrypted.",
            )}
          </Text>

          {!isLoading && (
            <Stack gap="md">
              <Group grow>
                <TextInput
                  label={t("Email address")}
                  placeholder="you@example.com"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.currentTarget.value)}
                />
                <TextInput
                  label={t("Username (optional)")}
                  placeholder={t("Defaults to email address")}
                  value={username}
                  onChange={(e) => setUsername(e.currentTarget.value)}
                />
              </Group>

              <Group grow align="end">
                <TextInput
                  label={t("IMAP host")}
                  placeholder="imap.example.com"
                  value={imapHost}
                  onChange={(e) => setImapHost(e.currentTarget.value)}
                />
                <NumberInput
                  label={t("IMAP port")}
                  value={imapPort}
                  onChange={(v) => setImapPort(v as number | string)}
                  min={1}
                  max={65535}
                />
                <Switch
                  label={t("Use SSL/TLS")}
                  checked={imapSecure}
                  onChange={(e) => setImapSecure(e.currentTarget.checked)}
                />
              </Group>

              <Group grow align="end">
                <TextInput
                  label={t("SMTP host (optional)")}
                  placeholder="smtp.example.com"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.currentTarget.value)}
                />
                <NumberInput
                  label={t("SMTP port")}
                  value={smtpPort}
                  onChange={(v) => setSmtpPort(v as number | string)}
                  min={1}
                  max={65535}
                />
                <Switch
                  label={t("Use SSL/TLS")}
                  checked={smtpSecure}
                  onChange={(e) => setSmtpSecure(e.currentTarget.checked)}
                />
              </Group>

              <PasswordInput
                label={t("Password")}
                placeholder={account?.configured ? SECRET_PLACEHOLDER : ""}
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
              />

              <Alert
                icon={<IconInfoCircle size={16} />}
                color="blue"
                variant="light"
              >
                {t(
                  "Use an app password if your provider requires one. Save first, then test the connection.",
                )}
              </Alert>

              <Group>
                <Button onClick={handleSave} loading={saveMutation.isPending}>
                  {t("Save")}
                </Button>
                <Button
                  variant="default"
                  onClick={handleTest}
                  loading={testing}
                >
                  {t("Test connection")}
                </Button>
                {account?.configured && (
                  <Button
                    variant="subtle"
                    color="red"
                    onClick={handleDisconnect}
                    loading={deleteMutation.isPending}
                  >
                    {t("Disconnect")}
                  </Button>
                )}
              </Group>
            </Stack>
          )}
        </Card>
      </Stack>
    </>
  );
}
