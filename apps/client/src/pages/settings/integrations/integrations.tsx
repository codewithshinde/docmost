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
import { IconInfoCircle, IconPhoneFilled } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { notifications } from "@mantine/notifications";
import { getAppName } from "@/lib/config.ts";
import SettingsTitle from "@/components/settings/settings-title.tsx";
import useUserRole from "@/hooks/use-user-role.tsx";
import {
  useCallSettingsQuery,
  useUpdateCallSettingsMutation,
} from "@/features/integration/queries/integration-query";
import { testCallConnection } from "@/features/integration/services/integration-service";
import { CallProvider } from "@/features/integration/types/integration.types";

const SECRET_PLACEHOLDER = "••••••••  (leave blank to keep)";

export default function IntegrationsSettings() {
  const { t } = useTranslation();
  const { isAdmin } = useUserRole();
  const { data: settings, isLoading } = useCallSettingsQuery();
  const updateMutation = useUpdateCallSettingsMutation();

  const [provider, setProvider] = useState<CallProvider>("livekit");
  const [enabled, setEnabled] = useState(false);
  const [livekitUrl, setLivekitUrl] = useState("");
  const [livekitApiKey, setLivekitApiKey] = useState("");
  const [livekitApiSecret, setLivekitApiSecret] = useState("");
  const [jitsiDomain, setJitsiDomain] = useState("");
  const [jitsiAppId, setJitsiAppId] = useState("");
  const [jitsiAppSecret, setJitsiAppSecret] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setProvider(settings.config.provider ?? settings.effective.provider);
    setEnabled(settings.enabled);
    setLivekitUrl(settings.config.livekitUrl ?? "");
    setJitsiDomain(settings.config.jitsiDomain ?? "");
    setJitsiAppId(settings.config.jitsiAppId ?? "");
  }, [settings]);

  if (!isAdmin) {
    return null;
  }

  const hasSecret = (field: string) =>
    settings?.secretKeys?.includes(field) ?? false;

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

  return (
    <>
      <Helmet>
        <title>
          {t("Integrations")} - {getAppName()}
        </title>
      </Helmet>
      <SettingsTitle title={t("Integrations")} />

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
                  value={livekitUrl}
                  onChange={(e) => setLivekitUrl(e.currentTarget.value)}
                />
                <PasswordInput
                  label={t("API key")}
                  placeholder={
                    hasSecret("livekitApiKey") ? SECRET_PLACEHOLDER : ""
                  }
                  value={livekitApiKey}
                  onChange={(e) => setLivekitApiKey(e.currentTarget.value)}
                />
                <PasswordInput
                  label={t("API secret")}
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

            <Switch
              label={t("Enable calls for this workspace")}
              checked={enabled}
              onChange={(e) => setEnabled(e.currentTarget.checked)}
            />

            <Alert
              icon={<IconInfoCircle size={16} />}
              color="blue"
              variant="light"
            >
              {t(
                "Save your credentials first, then use Test connection to verify them.",
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
              >
                {t("Test connection")}
              </Button>
            </Group>
          </Stack>
        )}
      </Card>
    </>
  );
}
