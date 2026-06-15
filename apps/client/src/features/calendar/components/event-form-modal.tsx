import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Checkbox,
  ColorSwatch,
  Group,
  Modal,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { DatePickerInput, DateTimePicker } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { useAtomValue } from "jotai";
import { addDays, addHours, parse, startOfDay } from "date-fns";
import { userAtom } from "@/features/user/atoms/current-user-atom";
import { MultiUserSelect } from "@/features/group/components/multi-user-select";
import {
  useCreateCalendarEventMutation,
  useUpdateCalendarEventMutation,
} from "../queries/calendar-query";
import { ICalendarEvent } from "../types/calendar.types";

function parseDateValue(value: string): Date {
  return parse(value, "yyyy-MM-dd", new Date());
}

function parseDateTimeValue(value: string): Date {
  return parse(value, "yyyy-MM-dd HH:mm:ss", new Date());
}

const COLOR_OPTIONS = [
  "#1c7ed6",
  "#2f9e44",
  "#e8590c",
  "#e03131",
  "#9c36b5",
  "#495057",
];

interface EventFormModalProps {
  opened: boolean;
  onClose: () => void;
  event?: ICalendarEvent | null;
  initialRange?: { start: Date; end: Date } | null;
  defaultPrivate?: boolean;
}

export function EventFormModal({
  opened,
  onClose,
  event,
  initialRange,
  defaultPrivate,
}: EventFormModalProps) {
  const { t } = useTranslation();
  const currentUser = useAtomValue(userAtom);
  const isEdit = !!event;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [start, setStart] = useState<Date>(new Date());
  const [end, setEnd] = useState<Date>(addHours(new Date(), 1));
  const [attendeeUserIds, setAttendeeUserIds] = useState<string[]>([]);
  const [addVideoCall, setAddVideoCall] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [color, setColor] = useState<string | undefined>(undefined);

  const createMutation = useCreateCalendarEventMutation();
  const updateMutation = useUpdateCalendarEventMutation();

  useEffect(() => {
    if (!opened) return;

    if (event) {
      setTitle(event.title);
      setDescription(event.description ?? "");
      setLocation(event.location ?? "");
      setAllDay(event.allDay);
      setStart(new Date(event.startsAt));
      setEnd(new Date(event.endsAt));
      setAttendeeUserIds(
        event.attendees
          .filter((a) => a.role !== "organizer")
          .map((a) => a.userId),
      );
      setAddVideoCall(!!event.meetingUrl);
      setIsPrivate(event.visibility === "private");
      setColor(event.color ?? undefined);
    } else {
      const initialStart = initialRange?.start ?? new Date();
      const initialEnd = initialRange?.end ?? addHours(initialStart, 1);
      setTitle("");
      setDescription("");
      setLocation("");
      setAllDay(false);
      setStart(initialStart);
      setEnd(initialEnd);
      setAttendeeUserIds([]);
      setAddVideoCall(false);
      setIsPrivate(!!defaultPrivate);
      setColor(undefined);
    }
  }, [opened, event, initialRange, defaultPrivate]);

  const handleAllDayToggle = (checked: boolean) => {
    setAllDay(checked);
    if (checked) {
      setStart(startOfDay(start));
      setEnd(startOfDay(end));
    }
  };

  const handleSubmit = () => {
    if (!title.trim()) return;

    const startsAt = allDay ? startOfDay(start) : start;
    const endsAt = allDay ? addDays(startOfDay(end), 1) : end;

    if (startsAt >= endsAt) {
      notifications.show({
        message: t("End time must be after start time"),
        color: "red",
      });
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      allDay,
      visibility: isPrivate ? ("private" as const) : ("default" as const),
      addVideoCall,
      color,
      attendeeUserIds,
    };

    if (isEdit) {
      updateMutation.mutate(
        { eventId: event.id, ...payload },
        { onSuccess: onClose },
      );
    } else {
      createMutation.mutate(payload, { onSuccess: onClose });
    }
  };

  const initialSelectedAttendees = event?.attendees
    ?.filter((a) => a.role !== "organizer")
    .map((a) => ({
      id: a.userId,
      name: a.name,
      email: a.email,
      avatarUrl: a.avatarUrl,
    }));

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? t("Edit event") : t("New event")}
      size="lg"
      centered
    >
      <Stack gap="sm">
        <TextInput
          label={t("Title")}
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          required
          data-autofocus
        />

        <Switch
          label={t("All day")}
          checked={allDay}
          onChange={(e) => handleAllDayToggle(e.currentTarget.checked)}
        />

        {allDay ? (
          <Group grow>
            <DatePickerInput
              label={t("Start date")}
              value={start}
              onChange={(value) => value && setStart(parseDateValue(value))}
            />
            <DatePickerInput
              label={t("End date")}
              value={end}
              onChange={(value) => value && setEnd(parseDateValue(value))}
              minDate={start}
            />
          </Group>
        ) : (
          <Group grow>
            <DateTimePicker
              label={t("Starts")}
              value={start}
              onChange={(value) => value && setStart(parseDateTimeValue(value))}
            />
            <DateTimePicker
              label={t("Ends")}
              value={end}
              onChange={(value) => value && setEnd(parseDateTimeValue(value))}
              minDate={start}
            />
          </Group>
        )}

        <TextInput
          label={t("Location")}
          value={location}
          onChange={(e) => setLocation(e.currentTarget.value)}
        />

        <Textarea
          label={t("Description")}
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          autosize
          minRows={2}
        />

        <MultiUserSelect
          label={t("Attendees")}
          onChange={setAttendeeUserIds}
          excludeUserIds={currentUser ? [currentUser.id] : []}
          initialSelectedUsers={initialSelectedAttendees}
        />

        <Checkbox
          label={t("Add video call")}
          checked={addVideoCall}
          onChange={(e) => setAddVideoCall(e.currentTarget.checked)}
        />

        <Switch
          label={t("Private (only you can see this event)")}
          checked={isPrivate}
          onChange={(e) => setIsPrivate(e.currentTarget.checked)}
        />

        <div>
          <Text size="sm" fw={500} mb={4}>
            {t("Color")}
          </Text>
          <Group gap="xs">
            <ColorSwatch
              color="var(--mantine-color-gray-4)"
              size={24}
              style={{
                cursor: "pointer",
                outline: !color ? "2px solid var(--mantine-color-blue-filled)" : undefined,
              }}
              onClick={() => setColor(undefined)}
            />
            {COLOR_OPTIONS.map((option) => (
              <ColorSwatch
                key={option}
                color={option}
                size={24}
                style={{
                  cursor: "pointer",
                  outline:
                    color === option
                      ? "2px solid var(--mantine-color-blue-filled)"
                      : undefined,
                }}
                onClick={() => setColor(option)}
              />
            ))}
          </Group>
        </div>

        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            loading={createMutation.isPending || updateMutation.isPending}
            disabled={!title.trim()}
          >
            {isEdit ? t("Save changes") : t("Create")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
