import { Badge, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { IconCalendar, IconPhoneCall } from "@tabler/icons-react";
import { addDays, format, startOfDay } from "date-fns";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCalendarEventsQuery } from "@/features/calendar/queries/calendar-query";

export default function DashboardCalendarBlock() {
  const { t } = useTranslation();
  const start = startOfDay(new Date());
  const end = addDays(start, 7);
  const { data: events } = useCalendarEventsQuery(
    start.toISOString(),
    end.toISOString(),
  );

  const upcoming = (events ?? [])
    .filter((event) => event.status !== "cancelled")
    .sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    )
    .slice(0, 4);

  return (
    <Paper withBorder radius="sm" p="md">
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          <IconCalendar size={18} />
          <Text fw={700}>{t("Calendar")}</Text>
        </Group>
        <Button component={Link} to="/calendar" size="xs" variant="subtle">
          {t("Open")}
        </Button>
      </Group>

      <Stack gap="xs">
        {upcoming.map((event) => (
          <Paper key={event.id} withBorder radius="sm" p="xs">
            <Group justify="space-between" wrap="nowrap">
              <div style={{ minWidth: 0 }}>
                <Text size="sm" fw={600} truncate>
                  {event.title}
                </Text>
                <Text size="xs" c="dimmed">
                  {event.allDay
                    ? t("All day")
                    : format(new Date(event.startsAt), "EEE, MMM d, p")}
                </Text>
              </div>
              {event.meetingUrl ? (
                <Button
                  component="a"
                  href={event.meetingUrl}
                  target="_blank"
                  size="xs"
                  leftSection={<IconPhoneCall size={14} />}
                >
                  {t("Join")}
                </Button>
              ) : (
                <Badge variant="light">{t("No call")}</Badge>
              )}
            </Group>
          </Paper>
        ))}
        {upcoming.length === 0 && (
          <Text size="sm" c="dimmed">
            {t("No upcoming events.")}
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
