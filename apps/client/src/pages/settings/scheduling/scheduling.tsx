import { useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Button,
  Card,
  Group,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import SettingsTitle from "@/components/settings/settings-title.tsx";
import { getAppName } from "@/lib/config.ts";
import {
  useCreateEventTypeMutation,
  useEventTypesQuery,
  useSaveScheduleMutation,
  useSchedulesQuery,
} from "@/features/scheduling/queries/scheduling-query";

const DEFAULT_RULES = [1, 2, 3, 4, 5].map((day) => ({
  day,
  start: "09:00",
  end: "17:00",
}));

export default function SchedulingSettings() {
  const { t } = useTranslation();
  const { data: schedules } = useSchedulesQuery();
  const { data: eventTypes } = useEventTypesQuery();
  const saveScheduleMutation = useSaveScheduleMutation();
  const createEventTypeMutation = useCreateEventTypeMutation();

  const [scheduleName, setScheduleName] = useState("Default availability");
  const [timeZone, setTimeZone] = useState("UTC");
  const [eventName, setEventName] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number | string>(30);
  const [scheduleId, setScheduleId] = useState<string | null>(null);

  return (
    <>
      <Helmet>
        <title>
          {t("Availability")} - {getAppName()}
        </title>
      </Helmet>
      <SettingsTitle title={t("Availability")} />

      <Stack gap="md">
        <Card withBorder radius="md" p="lg">
          <Text fw={600} mb="xs">
            {t("Availability")}
          </Text>
          <Text size="sm" c="dimmed" mb="md">
            {t("Create a default weekday availability schedule.")}
          </Text>
          <Group align="end" grow>
            <TextInput
              label={t("Name")}
              value={scheduleName}
              onChange={(e) => setScheduleName(e.currentTarget.value)}
            />
            <TextInput
              label={t("Time zone")}
              value={timeZone}
              onChange={(e) => setTimeZone(e.currentTarget.value)}
            />
            <Button
              onClick={() =>
                saveScheduleMutation.mutate({
                  name: scheduleName,
                  timeZone,
                  rules: DEFAULT_RULES,
                })
              }
              loading={saveScheduleMutation.isPending}
            >
              {t("Save schedule")}
            </Button>
          </Group>
        </Card>

        <Card withBorder radius="md" p="lg">
          <Text fw={600} mb="xs">
            {t("Event types")}
          </Text>
          <Text size="sm" c="dimmed" mb="md">
            {t("Create bookable meeting types backed by your availability.")}
          </Text>
          <Group align="end" grow>
            <TextInput
              label={t("Name")}
              placeholder="30 minute meeting"
              value={eventName}
              onChange={(e) => setEventName(e.currentTarget.value)}
            />
            <NumberInput
              label={t("Duration")}
              value={durationMinutes}
              onChange={setDurationMinutes}
              min={5}
            />
            <Select
              label={t("Schedule")}
              value={scheduleId}
              onChange={setScheduleId}
              data={(schedules ?? []).map((schedule) => ({
                value: schedule.id,
                label: schedule.name,
              }))}
            />
            <Button
              onClick={() =>
                createEventTypeMutation.mutate({
                  name: eventName,
                  scheduleId: scheduleId ?? undefined,
                  durationMinutes: Number(durationMinutes),
                })
              }
              disabled={!eventName || !scheduleId}
              loading={createEventTypeMutation.isPending}
            >
              {t("Create")}
            </Button>
          </Group>

          <Table mt="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("Name")}</Table.Th>
                <Table.Th>{t("Slug")}</Table.Th>
                <Table.Th>{t("Duration")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(eventTypes ?? []).map((eventType) => (
                <Table.Tr key={eventType.id}>
                  <Table.Td>{eventType.name}</Table.Td>
                  <Table.Td>{eventType.slug}</Table.Td>
                  <Table.Td>{eventType.durationMinutes}m</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      </Stack>
    </>
  );
}
