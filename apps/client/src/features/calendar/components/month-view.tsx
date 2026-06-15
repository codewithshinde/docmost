import { useTranslation } from "react-i18next";
import { Text } from "@mantine/core";
import {
  eachDayOfInterval,
  endOfDay,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
} from "date-fns";
import clsx from "clsx";
import { useDateFnsLocale } from "@/lib/date-locale";
import { ICalendarEvent } from "../types/calendar.types";
import { getViewRange } from "../utils/calendar-range";
import classes from "../styles/calendar.module.css";

const MAX_EVENTS_PER_DAY = 3;

interface MonthViewProps {
  anchorDate: Date;
  events: ICalendarEvent[];
  onSelectEvent: (event: ICalendarEvent) => void;
  onSelectDay: (date: Date) => void;
}

export function MonthView({
  anchorDate,
  events,
  onSelectEvent,
  onSelectDay,
}: MonthViewProps) {
  const { t } = useTranslation();
  const locale = useDateFnsLocale();
  const { start, end } = getViewRange("month", anchorDate);
  const days = eachDayOfInterval({ start, end });

  const weekdayLabels = days
    .slice(0, 7)
    .map((day) => format(day, "EEE", { locale }));

  return (
    <div className={classes.monthGrid}>
      {weekdayLabels.map((label) => (
        <div key={label} className={classes.weekdayHeader}>
          {label}
        </div>
      ))}

      {days.map((day) => {
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);
        const dayEvents = events
          .filter((event) => {
            const eventStart = new Date(event.startsAt);
            const eventEnd = new Date(event.endsAt);
            return eventStart <= dayEnd && eventEnd > dayStart;
          })
          .sort(
            (a, b) =>
              new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
          );

        const visibleEvents = dayEvents.slice(0, MAX_EVENTS_PER_DAY);
        const moreCount = dayEvents.length - visibleEvents.length;

        return (
          <div
            key={day.toISOString()}
            className={clsx(classes.dayCell, isToday(day) && classes.today)}
            onClick={() => onSelectDay(day)}
          >
            <Text
              className={clsx(
                classes.dayNumber,
                !isSameMonth(day, anchorDate) && classes.dimmed,
              )}
            >
              {format(day, "d")}
            </Text>

            {visibleEvents.map((event) => (
              <div
                key={event.id}
                className={clsx(
                  classes.eventChip,
                  event.status === "cancelled" && classes.eventChipCancelled,
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectEvent(event);
                }}
                title={event.title}
              >
                {event.allDay
                  ? event.title
                  : `${format(new Date(event.startsAt), "p", { locale })} ${event.title}`}
              </div>
            ))}

            {moreCount > 0 && (
              <div
                className={classes.moreLink}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectDay(day);
                }}
              >
                {t("+{{count}} more", { count: moreCount })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
