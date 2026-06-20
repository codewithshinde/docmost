import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Text } from "@mantine/core";
import {
  addDays,
  differenceInMinutes,
  endOfDay,
  format,
  isToday,
  startOfDay,
} from "date-fns";
import clsx from "clsx";
import { useDateFnsLocale } from "@/lib/date-locale";
import { ICalendarEvent } from "../types/calendar.types";
import classes from "../styles/calendar.module.css";

const HOUR_HEIGHT = 48;

interface TimeGridProps {
  days: Date[];
  events: ICalendarEvent[];
  onSelectEvent: (event: ICalendarEvent) => void;
  onSelectSlot: (start: Date, end: Date) => void;
}

export function TimeGrid({
  days,
  events,
  onSelectEvent,
  onSelectSlot,
}: TimeGridProps) {
  const { t } = useTranslation();
  const locale = useDateFnsLocale();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  useEffect(() => {
    const currentHour = isToday(days[0]) ? new Date().getHours() : 8;
    wrapperRef.current?.scrollTo({
      top: Math.max((currentHour - 1) * HOUR_HEIGHT, 0),
      behavior: "smooth",
    });
  }, [days]);

  const isEventOnDay = (event: ICalendarEvent, day: Date) => {
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    const eventStart = new Date(event.startsAt);
    const eventEnd = new Date(event.endsAt);
    return eventStart < addDays(dayEnd, 1) && eventEnd > dayStart;
  };

  const allDayEvents = events.filter((event) => event.allDay);
  const timedEvents = events.filter((event) => !event.allDay);

  return (
    <div className={classes.timeGridWrapper} ref={wrapperRef}>
      <div
        className={classes.timeGridHeader}
        style={{ gridTemplateColumns: `60px repeat(${days.length}, 1fr)` }}
      >
        <div className={classes.timeGridHeaderCell} />
        {days.map((day) => (
          <div key={day.toISOString()} className={classes.timeGridHeaderCell}>
            <Text size="sm" fw={isToday(day) ? 700 : 500}>
              {format(day, "EEE d", { locale })}
            </Text>
          </div>
        ))}
      </div>

      {allDayEvents.length > 0 && (
        <div
          className={classes.allDayRow}
          style={{ gridTemplateColumns: `60px repeat(${days.length}, 1fr)` }}
        >
          <div className={classes.allDayCell}>
            <Text size="xs" c="dimmed">
              {t("All day")}
            </Text>
          </div>
          {days.map((day) => (
            <div key={day.toISOString()} className={classes.allDayCell}>
              {allDayEvents
                .filter((event) => isEventOnDay(event, day))
                .map((event) => (
                  <div
                    key={event.id}
                    className={clsx(
                      classes.eventChip,
                      event.status === "cancelled" &&
                        classes.eventChipCancelled,
                    )}
                    onClick={() => onSelectEvent(event)}
                    title={event.title}
                  >
                    {event.title}
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}

      <div
        className={classes.timeGridBody}
        style={{ gridTemplateColumns: `60px repeat(${days.length}, 1fr)` }}
      >
        <div className={classes.timeGutter}>
          {hours.map((hour) => (
            <div key={hour} className={classes.hourLine}>
              <Text className={classes.timeGutterLabel}>
                {hour === 0
                  ? ""
                  : format(new Date(2000, 0, 1, hour), "ha", { locale })}
              </Text>
            </div>
          ))}
        </div>

        {days.map((day) => (
          <div key={day.toISOString()} className={classes.dayColumn}>
            {hours.map((hour) => (
              <div
                key={hour}
                className={classes.hourLine}
                onClick={() => {
                  const slotStart = new Date(day);
                  slotStart.setHours(hour, 0, 0, 0);
                  const slotEnd = new Date(slotStart);
                  slotEnd.setHours(hour + 1);
                  onSelectSlot(slotStart, slotEnd);
                }}
              />
            ))}

            {timedEvents
              .filter((event) => isEventOnDay(event, day))
              .map((event) => {
                const dayStart = startOfDay(day);
                const dayEnd = endOfDay(day);
                const eventStart = new Date(event.startsAt);
                const eventEnd = new Date(event.endsAt);

                const visibleStart =
                  eventStart < dayStart ? dayStart : eventStart;
                const visibleEnd = eventEnd > dayEnd ? dayEnd : eventEnd;

                const top =
                  (differenceInMinutes(visibleStart, dayStart) / 60) *
                  HOUR_HEIGHT;
                const height = Math.max(
                  (differenceInMinutes(visibleEnd, visibleStart) / 60) *
                    HOUR_HEIGHT,
                  18,
                );

                return (
                  <div
                    key={event.id}
                    className={clsx(
                      classes.timeEvent,
                      event.status === "cancelled" &&
                        classes.timeEventCancelled,
                    )}
                    style={{ top, height }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(event);
                    }}
                    title={event.title}
                  >
                    <Text size="xs" fw={500} truncate>
                      {event.title}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {format(eventStart, "p", { locale })} -{" "}
                      {format(eventEnd, "p", { locale })}
                    </Text>
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}
