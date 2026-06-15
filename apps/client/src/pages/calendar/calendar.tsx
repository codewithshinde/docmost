import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useAtomValue } from "jotai";
import {
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Indicator,
  Loader,
  Modal,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { Calendar } from "@mantine/dates";
import {
  addDays,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subDays,
} from "date-fns";
import { getAppName } from "@/lib/config.ts";
import { formatLocalized, useDateFnsLocale } from "@/lib/date-locale";
import { userAtom } from "@/features/user/atoms/current-user-atom";
import { useWorkspaceMembersQuery } from "@/features/workspace/queries/workspace-query";
import {
  useCreateBookingMutation,
  useMyBookingsQuery,
  useSlotsQuery,
  useUserEventTypesQuery,
} from "@/features/scheduling/queries/scheduling-query";
import { ISlot } from "@/features/scheduling/types/scheduling.types";
import classes from "@/features/scheduling/styles/calendar.module.css";

export default function CalendarPage() {
  const { t } = useTranslation();
  const locale = useDateFnsLocale();
  const currentUser = useAtomValue(userAtom);

  const today = format(new Date(), "yyyy-MM-dd");
  const [month, setMonth] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(
    null,
  );
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<
    string | null
  >(null);
  const [pendingSlot, setPendingSlot] = useState<ISlot | null>(null);
  const [bookerName, setBookerName] = useState(currentUser?.name ?? "");
  const [bookerEmail, setBookerEmail] = useState(currentUser?.email ?? "");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setBookerName(currentUser?.name ?? "");
    setBookerEmail(currentUser?.email ?? "");
  }, [currentUser?.name, currentUser?.email]);

  const monthStart = startOfMonth(parseISO(`${month}T00:00:00`));
  const monthEnd = endOfMonth(parseISO(`${month}T00:00:00`));
  const rangeStart = subDays(monthStart, 7).toISOString();
  const rangeEnd = addDays(monthEnd, 7).toISOString();

  const { data: myBookings, isLoading: isLoadingBookings } =
    useMyBookingsQuery(rangeStart, rangeEnd);

  const { data: membersData } = useWorkspaceMembersQuery({ limit: 100 });
  const { data: userEventTypes, isLoading: isLoadingEventTypes } =
    useUserEventTypesQuery(selectedMemberId);

  const slotDayStart = `${selectedDate}T00:00:00.000Z`;
  const slotDayEnd = `${selectedDate}T23:59:59.999Z`;
  const { data: slots, isLoading: isLoadingSlots } = useSlotsQuery(
    selectedEventTypeId,
    slotDayStart,
    slotDayEnd,
  );

  const createBookingMutation = useCreateBookingMutation();

  const bookingDates = useMemo(() => {
    const dates = new Set<string>();
    (myBookings ?? []).forEach((booking) => {
      dates.add(format(parseISO(booking.startsAt), "yyyy-MM-dd"));
    });
    return dates;
  }, [myBookings]);

  const selectedDayBookings = useMemo(() => {
    return (myBookings ?? []).filter(
      (booking) =>
        format(parseISO(booking.startsAt), "yyyy-MM-dd") === selectedDate,
    );
  }, [myBookings, selectedDate]);

  const memberOptions = useMemo(() => {
    return (membersData?.items ?? [])
      .filter((member) => member.id !== currentUser?.id)
      .map((member) => ({
        value: member.id,
        label: member.name || member.email || member.username || member.id,
      }));
  }, [membersData, currentUser?.id]);

  const eventTypeOptions = useMemo(() => {
    return (userEventTypes ?? []).map((eventType) => ({
      value: eventType.id,
      label: `${eventType.name} (${eventType.durationMinutes}m)`,
    }));
  }, [userEventTypes]);

  const selectedMemberName = memberOptions.find(
    (m) => m.value === selectedMemberId,
  )?.label;
  const selectedEventTypeName = eventTypeOptions.find(
    (e) => e.value === selectedEventTypeId,
  )?.label;

  const handleConfirmBooking = () => {
    if (!pendingSlot || !selectedEventTypeId) return;
    createBookingMutation.mutate(
      {
        eventTypeId: selectedEventTypeId,
        startsAt: pendingSlot.startsAt,
        bookerName,
        bookerEmail,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          setPendingSlot(null);
          setNotes("");
        },
      },
    );
  };

  return (
    <>
      <Helmet>
        <title>
          {t("Calendar")} - {getAppName()}
        </title>
      </Helmet>

      <Title order={3} mb="lg">
        {t("Calendar")}
      </Title>

      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder radius="md" p="lg">
            <Calendar
              className={classes.calendar}
              date={month}
              onDateChange={setMonth}
              getDayProps={(date) => ({
                selected: date === selectedDate,
                onClick: () => setSelectedDate(date),
              })}
              renderDay={(date) => {
                const day = Number(date.split("-")[2]);
                return (
                  <Indicator
                    size={6}
                    color="blue"
                    offset={-2}
                    disabled={!bookingDates.has(date)}
                    className={classes.dayIndicator}
                  >
                    {day}
                  </Indicator>
                );
              }}
            />
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Stack gap="md">
            <Card withBorder radius="md" p="lg">
              <Text fw={600} mb={4}>
                {t("Bookings")}
              </Text>
              <Text size="sm" c="dimmed" mb="md">
                {formatLocalized(
                  parseISO(`${selectedDate}T00:00:00`),
                  "EEEE, MMMM d, yyyy",
                  "PPPP",
                  locale,
                )}
              </Text>

              {isLoadingBookings ? (
                <Loader size="sm" />
              ) : selectedDayBookings.length === 0 ? (
                <Text size="sm" c="dimmed">
                  {t("No bookings on this day")}
                </Text>
              ) : (
                <Stack gap="sm">
                  {selectedDayBookings.map((booking) => (
                    <div key={booking.id} className={classes.bookingItem}>
                      <Group justify="space-between" wrap="nowrap">
                        <Text fw={600} size="sm">
                          {booking.eventTypeName || t("Meeting")}
                        </Text>
                        <Badge variant="light">
                          {format(parseISO(booking.startsAt), "p")} -{" "}
                          {format(parseISO(booking.endsAt), "p")}
                        </Badge>
                      </Group>
                      <Text size="sm">
                        {booking.bookerName} ({booking.bookerEmail})
                      </Text>
                      {booking.notes && (
                        <Text size="xs" c="dimmed">
                          {booking.notes}
                        </Text>
                      )}
                    </div>
                  ))}
                </Stack>
              )}
            </Card>

            <Card withBorder radius="md" p="lg">
              <Text fw={600} mb="xs">
                {t("Schedule with a teammate")}
              </Text>
              <Stack gap="sm">
                <Select
                  label={t("Teammate")}
                  placeholder={t("Select a teammate")}
                  data={memberOptions}
                  value={selectedMemberId}
                  onChange={(value) => {
                    setSelectedMemberId(value);
                    setSelectedEventTypeId(null);
                  }}
                  searchable
                  clearable
                />

                {selectedMemberId && (
                  <Select
                    label={t("Event type")}
                    placeholder={t("Select an event type")}
                    data={eventTypeOptions}
                    value={selectedEventTypeId}
                    onChange={setSelectedEventTypeId}
                    disabled={isLoadingEventTypes}
                    clearable
                  />
                )}

                {selectedEventTypeId && (
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>
                      {t("Available times")}
                    </Text>
                    {isLoadingSlots ? (
                      <Loader size="sm" />
                    ) : (slots ?? []).length === 0 ? (
                      <Text size="sm" c="dimmed">
                        {t("No available times on this day")}
                      </Text>
                    ) : (
                      <div className={classes.slotsGroup}>
                        {(slots ?? []).map((slot) => (
                          <Button
                            key={slot.startsAt}
                            variant="default"
                            size="xs"
                            onClick={() => setPendingSlot(slot)}
                          >
                            {format(parseISO(slot.startsAt), "p")}
                          </Button>
                        ))}
                      </div>
                    )}
                  </Stack>
                )}
              </Stack>
            </Card>
          </Stack>
        </Grid.Col>
      </Grid>

      <Modal
        opened={!!pendingSlot}
        onClose={() => setPendingSlot(null)}
        title={t("Confirm booking")}
        centered
      >
        {pendingSlot && (
          <Stack gap="sm">
            <Text size="sm">
              {selectedEventTypeName} {t("with")} {selectedMemberName}
            </Text>
            <Text size="sm" fw={600}>
              {formatLocalized(
                parseISO(pendingSlot.startsAt),
                "EEEE, MMMM d, yyyy",
                "PPPP",
                locale,
              )}
              {" · "}
              {format(parseISO(pendingSlot.startsAt), "p")} -{" "}
              {format(parseISO(pendingSlot.endsAt), "p")}
            </Text>
            <TextInput
              label={t("Your name")}
              value={bookerName}
              onChange={(e) => setBookerName(e.currentTarget.value)}
              required
            />
            <TextInput
              label={t("Your email")}
              type="email"
              value={bookerEmail}
              onChange={(e) => setBookerEmail(e.currentTarget.value)}
              required
            />
            <Textarea
              label={t("Notes (optional)")}
              value={notes}
              onChange={(e) => setNotes(e.currentTarget.value)}
              autosize
              minRows={2}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setPendingSlot(null)}>
                {t("Cancel")}
              </Button>
              <Button
                onClick={handleConfirmBooking}
                loading={createBookingMutation.isPending}
                disabled={!bookerName || !bookerEmail}
              >
                {t("Confirm booking")}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  );
}
