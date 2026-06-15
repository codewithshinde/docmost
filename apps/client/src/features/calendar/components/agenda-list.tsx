import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Group, Stack, Text } from "@mantine/core";
import { IconMapPin, IconVideo } from "@tabler/icons-react";
import { format, isSameDay } from "date-fns";
import { useDateFnsLocale } from "@/lib/date-locale";
import { formatLocalized } from "@/lib/date-locale";
import { ICalendarEvent } from "../types/calendar.types";
import classes from "../styles/calendar.module.css";

interface AgendaListProps {
  events: ICalendarEvent[];
  onSelectEvent: (event: ICalendarEvent) => void;
  emptyMessage?: string;
}

export function AgendaList({
  events,
  onSelectEvent,
  emptyMessage,
}: AgendaListProps) {
  const { t } = useTranslation();
  const locale = useDateFnsLocale();

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );

  if (sortedEvents.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {emptyMessage ?? t("No upcoming events")}
      </Text>
    );
  }

  let lastDate: Date | null = null;

  return (
    <Stack gap={4}>
      {sortedEvents.map((event) => {
        const eventStart = new Date(event.startsAt);
        const eventEnd = new Date(event.endsAt);
        const showDateHeading = !lastDate || !isSameDay(lastDate, eventStart);
        lastDate = eventStart;

        return (
          <Fragment key={event.id}>
            {showDateHeading && (
              <Text className={classes.agendaDateHeading}>
                {formatLocalized(
                  eventStart,
                  "EEEE, MMMM d",
                  "PPPP",
                  locale,
                ).replace(/,?\s*\d{4}$/, "")}
              </Text>
            )}
            <div
              className={classes.agendaItem}
              onClick={() => onSelectEvent(event)}
            >
              <div
                className={classes.agendaColorBar}
                style={event.color ? { backgroundColor: event.color } : undefined}
              />
              <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
                <Text
                  size="sm"
                  fw={500}
                  truncate
                  td={event.status === "cancelled" ? "line-through" : undefined}
                >
                  {event.title}
                </Text>
                <Text size="xs" c="dimmed">
                  {event.allDay
                    ? t("All day")
                    : `${format(eventStart, "p", { locale })} - ${format(eventEnd, "p", { locale })}`}
                </Text>
                {(event.location || event.meetingUrl) && (
                  <Group gap="xs">
                    {event.location && (
                      <Group gap={4}>
                        <IconMapPin size={14} className={classes.dimmed} />
                        <Text size="xs" c="dimmed" truncate>
                          {event.location}
                        </Text>
                      </Group>
                    )}
                    {event.meetingUrl && (
                      <Group gap={4}>
                        <IconVideo size={14} className={classes.dimmed} />
                        <Text size="xs" c="dimmed">
                          {t("Video call")}
                        </Text>
                      </Group>
                    )}
                  </Group>
                )}
              </Stack>
            </div>
          </Fragment>
        );
      })}
    </Stack>
  );
}
