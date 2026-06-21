import { useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Center,
  Group,
  Loader,
  Text,
  Title,
} from "@mantine/core";
import {
  IconArrowBackUp,
  IconArrowForward,
  IconCalendarEvent,
  IconCheck,
  IconClock,
  IconLink,
  IconMailOpened,
  IconMapPin,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import DOMPurify from "dompurify";
import { notifications } from "@mantine/notifications";
import { useMailMessageQuery } from "../queries/mail-account-query";
import { formatLocalized, useDateFnsLocale } from "@/lib/date-locale";
import { useCreateCalendarEventMutation } from "@/features/calendar/queries/calendar-query";
import { IMailCalendarInvite } from "../types/mail-account.types";
import classes from "../styles/inbox.module.css";
import { ComposeMailInitialValues } from "./compose-mail-modal";
import {
  buildForwardInitialValues,
  buildReplyInitialValues,
} from "../utils/mail-compose.utils";
import { avatarColor, initials } from "./mail-sidebar";

interface MailMessageReaderProps {
  uid: number | null;
  onCompose: (initialValues?: ComposeMailInitialValues) => void;
}

function formatInviteDateTime(startsAt: string, endsAt: string, allDay: boolean): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (isNaN(start.getTime())) return "";
  if (allDay) {
    return format(start, "EEEE, MMMM d, yyyy");
  }
  const datePart = format(start, "EEEE, MMMM d, yyyy");
  const timePart = `${format(start, "h:mm a")} – ${format(end, "h:mm a")}`;
  return `${datePart} · ${timePart}`;
}

interface CalendarInviteCardProps {
  invite: IMailCalendarInvite;
}

function CalendarInviteCard({ invite }: CalendarInviteCardProps) {
  const { t } = useTranslation();
  const [accepted, setAccepted] = useState(false);
  const [declined, setDeclined] = useState(false);
  const createEvent = useCreateCalendarEventMutation();

  const handleAccept = async () => {
    try {
      const loc = [invite.location, invite.meetingUrl].filter(Boolean).join(" · ");
      await createEvent.mutateAsync({
        title: invite.title,
        description: invite.description ?? undefined,
        location: loc || undefined,
        startsAt: new Date(invite.startsAt).toISOString(),
        endsAt: new Date(invite.endsAt).toISOString(),
        allDay: invite.allDay,
      });
      setAccepted(true);
      notifications.show({
        message: t("Event added to your calendar"),
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch {
      // error shown by mutation
    }
  };

  const handleDecline = () => {
    setDeclined(true);
    notifications.show({ message: t("Invite declined"), color: "gray" });
  };

  const dateLabel = formatInviteDateTime(invite.startsAt, invite.endsAt, invite.allDay);

  return (
    <div className={classes.inviteCard}>
      <div className={classes.inviteCardHeader}>
        <IconCalendarEvent size={14} />
        {invite.method === "CANCEL" ? t("Cancelled event") : t("Calendar invite")}
      </div>

      <div className={classes.inviteEventName}>{invite.title}</div>

      {dateLabel && (
        <div className={classes.inviteDetail}>
          <IconClock size={14} style={{ marginTop: 2, flexShrink: 0 }} />
          <span>{dateLabel}</span>
        </div>
      )}

      {invite.location && (
        <div className={classes.inviteDetail}>
          <IconMapPin size={14} style={{ marginTop: 2, flexShrink: 0 }} />
          <span>{invite.location}</span>
        </div>
      )}

      {invite.meetingUrl && (
        <div className={classes.inviteDetail}>
          <IconLink size={14} style={{ marginTop: 2, flexShrink: 0 }} />
          <a href={invite.meetingUrl} target="_blank" rel="noopener noreferrer">
            {invite.meetingUrl}
          </a>
        </div>
      )}

      {invite.organizerEmail && (
        <div className={classes.inviteDetail}>
          <IconUser size={14} style={{ marginTop: 2, flexShrink: 0 }} />
          <span>
            {t("From")} {invite.organizerEmail}
          </span>
        </div>
      )}

      {invite.attendeeEmails.length > 0 && (
        <div className={classes.inviteDetail}>
          <IconUser size={14} style={{ marginTop: 2, flexShrink: 0 }} />
          <span>
            {invite.attendeeEmails.slice(0, 3).join(", ")}
            {invite.attendeeEmails.length > 3 &&
              ` +${invite.attendeeEmails.length - 3} ${t("more")}`}
          </span>
        </div>
      )}

      <div className={classes.inviteDivider} />

      {invite.method === "CANCEL" ? (
        <Text size="sm" c="red">
          {t("This event has been cancelled.")}
        </Text>
      ) : accepted ? (
        <Badge color="green" variant="light" leftSection={<IconCheck size={12} />}>
          {t("Added to calendar")}
        </Badge>
      ) : declined ? (
        <Badge color="gray" variant="light" leftSection={<IconX size={12} />}>
          {t("Declined")}
        </Badge>
      ) : (
        <div className={classes.inviteActions}>
          <Button
            size="xs"
            color="green"
            leftSection={<IconCheck size={14} />}
            loading={createEvent.isPending}
            onClick={handleAccept}
          >
            {t("Accept")}
          </Button>
          <Button
            size="xs"
            color="yellow"
            variant="light"
            leftSection={<IconClock size={14} />}
            onClick={() => {
              setAccepted(true);
              notifications.show({ message: t("Tentatively accepted"), color: "yellow" });
            }}
          >
            {t("Tentative")}
          </Button>
          <Button
            size="xs"
            color="red"
            variant="light"
            leftSection={<IconX size={14} />}
            onClick={handleDecline}
          >
            {t("Decline")}
          </Button>
        </div>
      )}
    </div>
  );
}

export function MailMessageReader({ uid, onCompose }: MailMessageReaderProps) {
  const { t } = useTranslation();
  const locale = useDateFnsLocale();
  const { data: message, isLoading } = useMailMessageQuery(uid);

  if (uid === null) {
    return (
      <div className={classes.readerPane}>
        <div className={classes.placeholder}>
          <IconMailOpened size={40} stroke={1.5} />
          <Text fw={600}>{t("Select a message")}</Text>
          <Text size="sm">{t("Choose a message from the list to read it.")}</Text>
        </div>
      </div>
    );
  }

  if (isLoading || !message) {
    return (
      <div className={classes.readerPane}>
        <Center style={{ height: "100%" }}>
          <Loader size="sm" />
        </Center>
      </div>
    );
  }

  const senderLabel = message.from;
  const senderBg = avatarColor(senderLabel);
  const senderInitials = initials(senderLabel);

  return (
    <div className={classes.readerPane}>
      <div className={classes.readerHeader}>
        <Group justify="space-between" align="flex-start" wrap="nowrap" mb={4}>
          <Title order={4} style={{ lineHeight: 1.3 }}>
            {message.subject || t("(No subject)")}
          </Title>
          <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
            <Button
              variant="default"
              size="xs"
              leftSection={<IconArrowBackUp size={14} />}
              onClick={() => onCompose(buildReplyInitialValues(message, locale))}
            >
              {t("Reply")}
            </Button>
            <Button
              variant="default"
              size="xs"
              leftSection={<IconArrowForward size={14} />}
              onClick={() => onCompose(buildForwardInitialValues(message))}
            >
              {t("Forward")}
            </Button>
          </Group>
        </Group>

        <div className={classes.readerSenderRow}>
          <Avatar
            size={34}
            radius="xl"
            style={{ background: senderBg, color: "white", fontWeight: 600, fontSize: 13, flexShrink: 0 }}
          >
            {senderInitials}
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <Text size="sm" fw={500}>
              {message.from}
            </Text>
            <Text size="xs" c="dimmed">
              {t("To")}: {message.to}
            </Text>
          </div>
          {message.date && (
            <Text size="xs" c="dimmed" style={{ marginLeft: "auto", flexShrink: 0 }}>
              {formatLocalized(message.date, "PPpp", "PPpp", locale)}
            </Text>
          )}
        </div>
      </div>

      <div className={classes.readerScroll}>
        {message.calendarInvite && (
          <CalendarInviteCard invite={message.calendarInvite} />
        )}

        {message.html ? (
          <div
            className={classes.readerBody}
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(message.html, { ADD_ATTR: ["target"] }),
            }}
          />
        ) : (
          <Text className={classes.readerBody} style={{ whiteSpace: "pre-wrap" }}>
            {message.text}
          </Text>
        )}
      </div>
    </div>
  );
}
