import { ICalendarEvent } from "../types/calendar.types";
import { TimeGrid } from "./time-grid";

interface DayViewProps {
  anchorDate: Date;
  events: ICalendarEvent[];
  onSelectEvent: (event: ICalendarEvent) => void;
  onSelectSlot: (start: Date, end: Date) => void;
}

export function DayView({
  anchorDate,
  events,
  onSelectEvent,
  onSelectSlot,
}: DayViewProps) {
  return (
    <TimeGrid
      days={[anchorDate]}
      events={events}
      onSelectEvent={onSelectEvent}
      onSelectSlot={onSelectSlot}
    />
  );
}
