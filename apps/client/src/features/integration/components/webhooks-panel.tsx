import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  Group,
  MultiSelect,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { IconWebhook } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import {
  useCreateWebhookMutation,
  useDeleteWebhookMutation,
  useUpdateWebhookMutation,
  useWebhookDeliveriesQuery,
  useWebhooksQuery,
} from "../queries/webhook-query";

const WEBHOOK_EVENTS = [
  { value: "chat.message.created", label: "Chat message created" },
  { value: "*", label: "All events" },
];

export function WebhooksPanel() {
  const { t } = useTranslation();
  const { data: webhooks } = useWebhooksQuery();
  const createMutation = useCreateWebhookMutation();
  const updateMutation = useUpdateWebhookMutation();
  const deleteMutation = useDeleteWebhookMutation();

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["chat.message.created"]);
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null);
  const { data: deliveries } = useWebhookDeliveriesQuery(selectedWebhookId);

  const handleCreate = () => {
    createMutation.mutate({ name, url, events });
    setName("");
    setUrl("");
    setEvents(["chat.message.created"]);
  };

  return (
    <Card withBorder radius="md" p="lg">
      <Group justify="space-between" mb="xs">
        <Group gap="xs">
          <IconWebhook size={18} />
          <Text fw={600}>{t("Webhooks")}</Text>
        </Group>
        <Badge variant="light">{webhooks?.length ?? 0}</Badge>
      </Group>
      <Text size="sm" c="dimmed" mb="md">
        {t(
          "Send signed HTTP callbacks when Likh events happen. Payloads include x-likh-signature HMAC headers.",
        )}
      </Text>

      <Stack gap="md">
        <Group align="end" grow>
          <TextInput
            label={t("Name")}
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
          <TextInput
            label={t("Endpoint URL")}
            placeholder="https://example.com/webhooks/likh"
            value={url}
            onChange={(e) => setUrl(e.currentTarget.value)}
          />
        </Group>
        <Group align="end">
          <MultiSelect
            label={t("Events")}
            data={WEBHOOK_EVENTS}
            value={events}
            onChange={setEvents}
            style={{ flex: 1 }}
          />
          <Button
            onClick={handleCreate}
            loading={createMutation.isPending}
            disabled={!name || !url || events.length === 0}
          >
            {t("Create webhook")}
          </Button>
        </Group>

        {(webhooks ?? []).map((webhook) => (
          <Card key={webhook.id} withBorder radius="md" p="md">
            <Group justify="space-between">
              <div>
                <Text fw={600}>{webhook.name}</Text>
                <Text size="sm" c="dimmed">
                  {webhook.url}
                </Text>
                <Text size="xs" c="dimmed">
                  {webhook.events.join(", ")}
                </Text>
              </div>
              <Group>
                <Switch
                  checked={webhook.enabled}
                  onChange={(e) =>
                    updateMutation.mutate({
                      webhookId: webhook.id,
                      enabled: e.currentTarget.checked,
                    })
                  }
                />
                <Button
                  size="xs"
                  variant="default"
                  onClick={() =>
                    setSelectedWebhookId((current) =>
                      current === webhook.id ? null : webhook.id,
                    )
                  }
                >
                  {t("Deliveries")}
                </Button>
                <Button
                  size="xs"
                  color="red"
                  variant="subtle"
                  onClick={() => deleteMutation.mutate(webhook.id)}
                >
                  {t("Delete")}
                </Button>
              </Group>
            </Group>

            {selectedWebhookId === webhook.id && (
              <Table mt="md">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t("Event")}</Table.Th>
                    <Table.Th>{t("Status")}</Table.Th>
                    <Table.Th>{t("Code")}</Table.Th>
                    <Table.Th>{t("Error")}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {(deliveries ?? []).map((delivery) => (
                    <Table.Tr key={delivery.id}>
                      <Table.Td>{delivery.event}</Table.Td>
                      <Table.Td>{delivery.status}</Table.Td>
                      <Table.Td>{delivery.statusCode ?? "-"}</Table.Td>
                      <Table.Td>{delivery.error ?? "-"}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        ))}
      </Stack>
    </Card>
  );
}
