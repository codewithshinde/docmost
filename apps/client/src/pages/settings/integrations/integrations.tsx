import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  PasswordInput,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import {
  IconInfoCircle,
  IconMail,
  IconPhoneFilled,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { notifications } from "@mantine/notifications";
import { getAppName } from "@/lib/config.ts";
import SettingsTitle from "@/components/settings/settings-title.tsx";
import useUserRole from "@/hooks/use-user-role.tsx";
import {
  useCallSettingsQuery,
  useMailSettingsQuery,
  useUpdateCallSettingsMutation,
  useUpdateMailSettingsMutation,
} from "@/features/integration/queries/integration-query";
import {
  testCallConnection,
  testMailConnection,
} from "@/features/integration/services/integration-service";
import {
  CallProvider,
  MailProvider,
} from "@/features/integration/types/integration.types";
import { WebhooksPanel } from "@/features/integration/components/webhooks-panel";

const SECRET_PLACEHOLDER = "••••••••  (leave blank to keep)";

export default function IntegrationsSettings() {
  const { t } = useTranslation();
  const { isAdmin } = useUserRole();
  const { data: settings, isLoading } = useCallSettingsQuery();
  const { data: mailSettings, isLoading: isMailLoading } = useMailSettingsQuery();
  const updateMutation = useUpdateCallSettingsMutation();
  const updateMailMutation = useUpdateMailSettingsMutation();

  const [provider, setProvider] = useState<CallProvider>("livekit");
  const [enabled, setEnabled] = useState(false);
  const [livekitUrl, setLivekitUrl] = useState("");
  const [livekitApiKey, setLivekitApiKey] = useState("");
  const [livekitApiSecret, setLivekitApiSecret] = useState("");
  const [jitsiDomain, setJitsiDomain] = useState("");
  const [jitsiAppId, setJitsiAppId] = useState("");
  const [jitsiAppSecret, setJitsiAppSecret] = useState("");
  const [testing, setTesting] = useState(false);
  const [mailTesting, setMailTesting] = useState(false);

  const [mailProvider, setMailProvider] = useState<MailProvider>("smtp");
  const [mailEnabled, setMailEnabled] = useState(false);
  const [fromAddress, setFromAddress] = useState("");
  const [fromName, setFromName] = useState("Likh");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpIgnoreTls, setSmtpIgnoreTls] = useState(false);
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [postmarkToken, setPostmarkToken] = useState("");
  const [sendgridApiKey, setSendgridApiKey] = useState("");
  const [mailgunApiKey, setMailgunApiKey] = useState("");
  const [mailgunDomain, setMailgunDomain] = useState("");
  const [mailgunApiBaseUrl, setMailgunApiBaseUrl] = useState(
    "https://api.mailgun.net",
  );
  const [sesAccessKeyId, setSesAccessKeyId] = useState("");
  const [sesSecretAccessKey, setSesSecretAccessKey] = useState("");
  const [sesRegion, setSesRegion] = useState("");

  useEffect(() => {
    if (!settings) return;
    setProvider(settings.config.provider ?? settings.effective.provider);
    setEnabled(settings.enabled);
    setLivekitUrl(settings.config.livekitUrl ?? "");
    setJitsiDomain(settings.config.jitsiDomain ?? "");
    setJitsiAppId(settings.config.jitsiAppId ?? "");
  }, [settings]);

  useEffect(() => {
    if (!mailSettings) return;
    setMailProvider(mailSettings.config.provider ?? mailSettings.effective.provider);
    setMailEnabled(mailSettings.enabled);
    setFromAddress(mailSettings.config.fromAddress ?? "");
    setFromName(mailSettings.config.fromName ?? "Likh");
    setSmtpHost(mailSettings.config.smtpHost ?? "");
    setSmtpPort(String(mailSettings.config.smtpPort ?? 587));
    setSmtpSecure(mailSettings.config.smtpSecure ?? false);
    setSmtpIgnoreTls(mailSettings.config.smtpIgnoreTls ?? false);
    setMailgunDomain(mailSettings.config.mailgunDomain ?? "");
    setMailgunApiBaseUrl(
      mailSettings.config.mailgunApiBaseUrl ?? "https://api.mailgun.net",
    );
    setSesRegion(mailSettings.config.sesRegion ?? "");
  }, [mailSettings]);

  if (!isAdmin) {
    return null;
  }

  const hasSecret = (field: string) =>
    settings?.secretKeys?.includes(field) ?? false;
  const hasMailSecret = (field: string) =>
    mailSettings?.secretKeys?.includes(field) ?? false;

  const handleSave = () => {
    updateMutation.mutate({
      provider,
      enabled,
      livekitUrl,
      jitsiDomain,
      jitsiAppId,
      // only send secrets the admin actually typed; blanks preserve existing
      ...(livekitApiKey ? { livekitApiKey } : {}),
      ...(livekitApiSecret ? { livekitApiSecret } : {}),
      ...(jitsiAppSecret ? { jitsiAppSecret } : {}),
    });
    setLivekitApiKey("");
    setLivekitApiSecret("");
    setJitsiAppSecret("");
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await testCallConnection();
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

  const handleMailSave = () => {
    updateMailMutation.mutate({
      provider: mailProvider,
      enabled: mailEnabled,
      fromAddress,
      fromName,
      smtpHost,
      smtpPort: Number(smtpPort),
      smtpSecure,
      smtpIgnoreTls,
      mailgunDomain,
      mailgunApiBaseUrl,
      sesRegion,
      ...(smtpUsername ? { smtpUsername } : {}),
      ...(smtpPassword ? { smtpPassword } : {}),
      ...(postmarkToken ? { postmarkToken } : {}),
      ...(sendgridApiKey ? { sendgridApiKey } : {}),
      ...(mailgunApiKey ? { mailgunApiKey } : {}),
      ...(sesAccessKeyId ? { sesAccessKeyId } : {}),
      ...(sesSecretAccessKey ? { sesSecretAccessKey } : {}),
    });
    setSmtpUsername("");
    setSmtpPassword("");
    setPostmarkToken("");
    setSendgridApiKey("");
    setMailgunApiKey("");
    setSesAccessKeyId("");
    setSesSecretAccessKey("");
  };

  const handleMailTest = async () => {
    setMailTesting(true);
    try {
      const result = await testMailConnection();
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
      setMailTesting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>
          {t("Integrations")} - {getAppName()}
        </title>
      </Helmet>
      <SettingsTitle title={t("Integrations")} />

      <Stack gap="md">
      <Card withBorder radius="md" p="lg">
        <Group justify="space-between" mb="xs">
          <Group gap="xs">
            <IconPhoneFilled size={18} />
            <Text fw={600}>{t("Voice & video calls")}</Text>
          </Group>
          {settings?.effective?.enabled ? (
            <Badge color="green" variant="light">
              {t("Connected")}
            </Badge>
          ) : settings?.effective?.configured ? (
            <Badge color="yellow" variant="light">
              {t("Configured, disabled")}
            </Badge>
          ) : (
            <Badge color="gray" variant="light">
              {t("Not configured")}
            </Badge>
          )}
        </Group>

        <Text size="sm" c="dimmed" mb="md">
          {t(
            "Enable in-channel calls using LiveKit or Jitsi. Credentials are stored encrypted.",
          )}
        </Text>

        {!isLoading && (
          <Stack gap="md">
            <Switch
              label={t("Enable calls for this workspace")}
              description={t("Allow members to start voice and video calls in channels.")}
              checked={enabled}
              onChange={(e) => setEnabled(e.currentTarget.checked)}
            />

            <Select
              label={t("Provider")}
              value={provider}
              onChange={(value) =>
                setProvider((value as CallProvider) ?? "livekit")
              }
              data={[
                { value: "livekit", label: "LiveKit" },
                { value: "jitsi", label: "Jitsi" },
              ]}
              allowDeselect={false}
            />

            {provider === "livekit" && (
              <>
                <TextInput
                  label={t("LiveKit URL")}
                  placeholder="wss://your-livekit-host"
                  description={t("WebSocket URL of your LiveKit server")}
                  value={livekitUrl}
                  onChange={(e) => setLivekitUrl(e.currentTarget.value)}
                />
                <PasswordInput
                  label={t("API key")}
                  description={
                    hasSecret("livekitApiKey")
                      ? t("A key is already saved — leave blank to keep it.")
                      : t("Found in your LiveKit dashboard under API Keys")
                  }
                  placeholder={
                    hasSecret("livekitApiKey") ? SECRET_PLACEHOLDER : ""
                  }
                  value={livekitApiKey}
                  onChange={(e) => setLivekitApiKey(e.currentTarget.value)}
                />
                <PasswordInput
                  label={t("API secret")}
                  description={
                    hasSecret("livekitApiSecret")
                      ? t("A secret is already saved — leave blank to keep it.")
                      : t("Found in your LiveKit dashboard under API Keys")
                  }
                  placeholder={
                    hasSecret("livekitApiSecret") ? SECRET_PLACEHOLDER : ""
                  }
                  value={livekitApiSecret}
                  onChange={(e) => setLivekitApiSecret(e.currentTarget.value)}
                />
              </>
            )}

            {provider === "jitsi" && (
              <>
                <TextInput
                  label={t("Jitsi domain")}
                  placeholder="meet.example.com"
                  value={jitsiDomain}
                  onChange={(e) => setJitsiDomain(e.currentTarget.value)}
                />
                <TextInput
                  label={t("App ID (optional, for JWT auth)")}
                  value={jitsiAppId}
                  onChange={(e) => setJitsiAppId(e.currentTarget.value)}
                />
                <PasswordInput
                  label={t("App secret (optional, for JWT auth)")}
                  placeholder={
                    hasSecret("jitsiAppSecret") ? SECRET_PLACEHOLDER : ""
                  }
                  value={jitsiAppSecret}
                  onChange={(e) => setJitsiAppSecret(e.currentTarget.value)}
                />
              </>
            )}

            <Alert
              icon={<IconInfoCircle size={16} />}
              color="blue"
              variant="light"
            >
              {t(
                "Enable the toggle, enter your credentials, then Save. Use Test connection to verify the server is reachable.",
              )}
            </Alert>

            <Group>
              <Button
                onClick={handleSave}
                loading={updateMutation.isPending}
              >
                {t("Save")}
              </Button>
              <Button
                variant="default"
                onClick={handleTest}
                loading={testing}
                disabled={!settings?.effective?.configured}
              >
                {t("Test connection")}
              </Button>
            </Group>
          </Stack>
        )}
      </Card>
      <Card withBorder radius="md" p="lg">
        <Group justify="space-between" mb="xs">
          <Group gap="xs">
            <IconMail size={18} />
            <Text fw={600}>{t("Transactional mail")}</Text>
          </Group>
          {mailSettings?.effective?.enabled ? (
            <Badge color="green" variant="light">
              {t("Connected")}
            </Badge>
          ) : (
            <Badge color="gray" variant="light">
              {t("Not configured")}
            </Badge>
          )}
        </Group>

        <Text size="sm" c="dimmed" mb="md">
          {t(
            "Configure workspace sender identity and provider credentials. Secrets are stored encrypted.",
          )}
        </Text>

        {!isMailLoading && (
          <Stack gap="md">
            <Select
              label={t("Provider")}
              value={mailProvider}
              onChange={(value) => setMailProvider((value as MailProvider) ?? "smtp")}
              data={[
                { value: "smtp", label: "SMTP" },
                { value: "postmark", label: "Postmark" },
                { value: "sendgrid", label: "SendGrid" },
                { value: "mailgun", label: "Mailgun" },
                { value: "ses", label: "AWS SES" },
                { value: "log", label: "Log only" },
              ]}
              allowDeselect={false}
            />

            <Group grow>
              <TextInput
                label={t("From address")}
                placeholder="hello@example.com"
                value={fromAddress}
                onChange={(e) => setFromAddress(e.currentTarget.value)}
              />
              <TextInput
                label={t("From name")}
                value={fromName}
                onChange={(e) => setFromName(e.currentTarget.value)}
              />
            </Group>

            {mailProvider === "smtp" && (
              <>
                <Group grow>
                  <TextInput
                    label={t("SMTP host")}
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.currentTarget.value)}
                  />
                  <TextInput
                    label={t("SMTP port")}
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.currentTarget.value)}
                  />
                </Group>
                <Group grow>
                  <PasswordInput
                    label={t("SMTP username")}
                    placeholder={hasMailSecret("smtpUsername") ? SECRET_PLACEHOLDER : ""}
                    value={smtpUsername}
                    onChange={(e) => setSmtpUsername(e.currentTarget.value)}
                  />
                  <PasswordInput
                    label={t("SMTP password")}
                    placeholder={hasMailSecret("smtpPassword") ? SECRET_PLACEHOLDER : ""}
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.currentTarget.value)}
                  />
                </Group>
                <Group>
                  <Switch
                    label={t("Use TLS")}
                    checked={smtpSecure}
                    onChange={(e) => setSmtpSecure(e.currentTarget.checked)}
                  />
                  <Switch
                    label={t("Ignore TLS")}
                    checked={smtpIgnoreTls}
                    onChange={(e) => setSmtpIgnoreTls(e.currentTarget.checked)}
                  />
                </Group>
              </>
            )}

            {mailProvider === "postmark" && (
              <PasswordInput
                label={t("Postmark token")}
                placeholder={hasMailSecret("postmarkToken") ? SECRET_PLACEHOLDER : ""}
                value={postmarkToken}
                onChange={(e) => setPostmarkToken(e.currentTarget.value)}
              />
            )}

            {mailProvider === "sendgrid" && (
              <PasswordInput
                label={t("SendGrid API key")}
                placeholder={hasMailSecret("sendgridApiKey") ? SECRET_PLACEHOLDER : ""}
                value={sendgridApiKey}
                onChange={(e) => setSendgridApiKey(e.currentTarget.value)}
              />
            )}

            {mailProvider === "mailgun" && (
              <>
                <TextInput
                  label={t("Mailgun domain")}
                  value={mailgunDomain}
                  onChange={(e) => setMailgunDomain(e.currentTarget.value)}
                />
                <TextInput
                  label={t("Mailgun API base URL")}
                  value={mailgunApiBaseUrl}
                  onChange={(e) => setMailgunApiBaseUrl(e.currentTarget.value)}
                />
                <PasswordInput
                  label={t("Mailgun API key")}
                  placeholder={hasMailSecret("mailgunApiKey") ? SECRET_PLACEHOLDER : ""}
                  value={mailgunApiKey}
                  onChange={(e) => setMailgunApiKey(e.currentTarget.value)}
                />
              </>
            )}

            {mailProvider === "ses" && (
              <>
                <TextInput
                  label={t("SES region")}
                  placeholder="us-east-1"
                  value={sesRegion}
                  onChange={(e) => setSesRegion(e.currentTarget.value)}
                />
                <Group grow>
                  <PasswordInput
                    label={t("Access key ID")}
                    placeholder={hasMailSecret("sesAccessKeyId") ? SECRET_PLACEHOLDER : ""}
                    value={sesAccessKeyId}
                    onChange={(e) => setSesAccessKeyId(e.currentTarget.value)}
                  />
                  <PasswordInput
                    label={t("Secret access key")}
                    placeholder={hasMailSecret("sesSecretAccessKey") ? SECRET_PLACEHOLDER : ""}
                    value={sesSecretAccessKey}
                    onChange={(e) => setSesSecretAccessKey(e.currentTarget.value)}
                  />
                </Group>
              </>
            )}

            <Switch
              label={t("Enable mail for this workspace")}
              checked={mailEnabled}
              onChange={(e) => setMailEnabled(e.currentTarget.checked)}
            />

            <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
              {t(
                "Save first, then test the connection. Empty secret fields keep the current encrypted value.",
              )}
            </Alert>

            <Group>
              <Button onClick={handleMailSave} loading={updateMailMutation.isPending}>
                {t("Save")}
              </Button>
              <Button variant="default" onClick={handleMailTest} loading={mailTesting}>
                {t("Test connection")}
              </Button>
            </Group>
          </Stack>
        )}
      </Card>
      <WebhooksPanel />
      </Stack>
    </>
  );
}
