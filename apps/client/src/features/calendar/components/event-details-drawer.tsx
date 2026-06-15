import { useTranslation } from "react-i18next";
import {
  Badge,
  Button,
  Drawer,
  Group,
  Loader,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconCalendarTime,
  IconCheck,
  IconHelp,
  IconMapPin,
  IconVideo,
  IconX,
} from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { useAtomValue } from "jotai";
import { format, type Locale } from "date-fns";
import { useDateFnsLocale } from "@/lib/date-locale";
import { userAtom } from "@/features/user/atoms/current-user-atom";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import {
  useCalendarEventQuery,
  useDeleteCalendarEventMutation,
  useRespondCalendarEventMutation,
} from "../queries/calendar-query";
import {
  CalendarResponseStatus,
  ICalendarEvent,
} from "../types/calendar.types";

interface EventDetailsDrawerProps {
  eventId: string | null;
  opened: boolean;
  onClose: () => void;
  onEdit: (event: ICalendarEvent) => void;
}

export function EventDetailsDrawer({
  eventId,
  opened,
  onClose,
  onEdit,
}: EventDetailsDrawerProps) {
  const { t } = useTranslation();
  const locale = useDateFnsLocale();
  const currentUser = useAtomValue(userAtom);

  const { data: event, isLoading } = useCalendarEventQuery(eventId);
  const respondMutation = useRespondCalendarEventMutation();
  const deleteMutation = useDeleteCalendarEventMutation();

  const handleRespond = (responseStatus: CalendarResponseStatus) => {
    if (!event) return;
    respondMutation.mutate({
      eventId: event.id,
      responseStatus: responseStatus as "accepted" | "declined" | "tentative",
    });
  };

  const handleCancelEvent = () => {
    if (!event) return;
    modals.openConfirmModal({
      title: t("Cancel event"),
      children: (
        <Text size="sm">
          {t("Are you sure you want to cancel this event? All attendees will be notified.")}
        </Text>
      ),
      labels: { confirm: t("Cancel event"), cancel: t("Close") },
      confirmProps: { color: "red" },
      onConfirm: () => {
        deleteMutation.mutate(event.id, { onSuccess: onClose });
      },
    });
  };

  const isOrganizer = event?.organizerId === currentUser?.id;
  const myAttendee = event?.attendees.find(
    (a) => a.userId === currentUser?.id,
  );
  const isCancelled = event?.status === "cancelled";

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={isLoading ? "" : event?.title}
      position="right"
      size="md"
    >
      {isLoading || !event ? (
        <Group justify="center" mt="xl">
          <Loader size="sm" />
        </Group>
      ) : (
        <Stack gap="md">
          {isCancelled && (
            <Badge color="red" variant="light">
              {t("Cancelled")}
            </Badge>
          )}

          <Group gap="xs" wrap="nowrap">
            <IconCalendarTime size={18} />
            <Text size="sm">
              {event.allDay
                ? formatRangeLabel(event, locale, true)
                : formatRangeLabel(event, locale, false)}
            </Text>
          </Group>

          {event.location && (
            <Group gap="xs" wrap="nowrap">
              <IconMapPin size={18} />
              <Text size="sm">{event.location}</Text>
            </Group>
          )}

          {event.meetingUrl && (
            <Group gap="xs" wrap="nowrap">
              <IconVideo size={18} />
              <Button
                component="a"
                href={event.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="light"
                size="xs"
              >
                {t("Join video call")}
              </Button>
            </Group>
          )}

          {event.description && (
            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
              {event.description}
            </Text>
          )}

          <div>
            <Text size="sm" fw={600} mb="xs">
              {t("Attendees")} ({event.attendees.length})
            </Text>
            <Stack gap="xs">
              {event.attendees.map((attendee) => (
                <Group key={attendee.userId} justify="space-between" wrap="nowrap">
                  <Group gap="sm" wrap="nowrap">
                    <CustomAvatar
                      avatarUrl={attendee.avatarUrl}
                      name={attendee.name}
                      size={28}
                    />
                    <div style={{ minWidth: 0 }}>
                      <Text size="sm" truncate>
                        {attendee.name}
                        {attendee.role === "organizer" && (
                          <Text component="span" size="xs" c="dimmed">
                            {" "}
                            ({t("Organizer")})
                          </Text>
                        )}
                      </Text>
                    </div>
                  </Group>
                  <ResponseBadge status={attendee.responseStatus} />
                </Group>
              ))}
            </Stack>
          </div>

          {!isCancelled && isOrganizer && (
            <Group justify="flex-end" mt="md">
              <Button color="red" variant="light" onClick={handleCancelEvent} loading={deleteMutation.isPending}>
                {t("Cancel event")}
              </Button>
              <Button onClick={() => onEdit(event)}>{t("Edit")}</Button>
            </Group>
          )}

          {!isCancelled && !isOrganizer && myAttendee && (
            <Group justify="flex-end" mt="md">
              <Button
                variant={myAttendee.responseStatus === "declined" ? "filled" : "light"}
                color="red"
                leftSection={<IconX size={16} />}
                onClick={() => handleRespond("declined")}
                loading={respondMutation.isPending}
              >
                {t("Decline")}
              </Button>
              <Button
                variant={myAttendee.responseStatus === "tentative" ? "filled" : "light"}
                color="yellow"
                leftSection={<IconHelp size={16} />}
                onClick={() => handleRespond("tentative")}
                loading={respondMutation.isPending}
              >
                {t("Maybe")}
              </Button>
              <Button
                variant={myAttendee.responseStatus === "accepted" ? "filled" : "light"}
                color="green"
                leftSection={<IconCheck size={16} />}
                onClick={() => handleRespond("accepted")}
                loading={respondMutation.isPending}
              >
                {t("Accept")}
              </Button>
            </Group>
          )}
        </Stack>
      )}
    </Drawer>
  );
}

function ResponseBadge({ status }: { status: CalendarResponseStatus }) {
  const { t } = useTranslation();
  switch (status) {
    case "accepted":
      return <Badge color="green" variant="light">{t("Accepted")}</Badge>;
    case "declined":
      return <Badge color="red" variant="light">{t("Declined")}</Badge>;
    case "tentative":
      return <Badge color="yellow" variant="light">{t("Maybe")}</Badge>;
    default:
      return <Badge color="gray" variant="light">{t("Pending")}</Badge>;
  }
}

function formatRangeLabel(
  event: ICalendarEvent,
  locale: Locale,
  allDay: boolean,
): string {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);

  if (allDay) {
    return format(start, "EEEE, MMMM d, yyyy", { locale });
  }

  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    return `${format(start, "EEEE, MMMM d, yyyy", { locale })} · ${format(start, "p", { locale })} - ${format(end, "p", { locale })}`;
  }

  return `${format(start, "MMM d, yyyy p", { locale })} - ${format(end, "MMM d, yyyy p", { locale })}`;
}
