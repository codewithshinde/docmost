import { eachDayOfInterval } from "date-fns";
import { ICalendarEvent } from "../types/calendar.types";
import { getViewRange } from "../utils/calendar-range";
import { TimeGrid } from "./time-grid";

interface WeekViewProps {
  anchorDate: Date;
  events: ICalendarEvent[];
  onSelectEvent: (event: ICalendarEvent) => void;
  onSelectSlot: (start: Date, end: Date) => void;
}

export function WeekView({
  anchorDate,
  events,
  onSelectEvent,
  onSelectSlot,
}: WeekViewProps) {
  const { start, end } = getViewRange("week", anchorDate);
  const days = eachDayOfInterval({ start, end });

  return (
    <TimeGrid
      days={days}
      events={events}
      onSelectEvent={onSelectEvent}
      onSelectSlot={onSelectSlot}
    />
  );
}
