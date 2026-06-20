import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export type CalendarViewType = "month" | "week" | "day" | "agenda";

export const AGENDA_DAYS_AHEAD = 30;

export function getViewRange(
  view: CalendarViewType,
  anchorDate: Date,
): { start: Date; end: Date } {
  switch (view) {
    case "month": {
      const monthStart = startOfMonth(anchorDate);
      const monthEnd = endOfMonth(anchorDate);
      return {
        start: startOfWeek(monthStart, { weekStartsOn: 0 }),
        end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
      };
    }
    case "week":
      return {
        start: startOfWeek(anchorDate, { weekStartsOn: 0 }),
        end: endOfWeek(anchorDate, { weekStartsOn: 0 }),
      };
    case "day":
      return { start: startOfDay(anchorDate), end: endOfDay(anchorDate) };
    case "agenda":
      return {
        start: startOfDay(anchorDate),
        end: endOfDay(addDays(anchorDate, AGENDA_DAYS_AHEAD)),
      };
    default:
      return { start: startOfDay(anchorDate), end: endOfDay(anchorDate) };
  }
}

export function shiftAnchorDate(
  view: CalendarViewType,
  anchorDate: Date,
  direction: 1 | -1,
): Date {
  switch (view) {
    case "month":
      return addMonths(anchorDate, direction);
    case "week":
      return addWeeks(anchorDate, direction);
    case "agenda":
      return addDays(anchorDate, direction * AGENDA_DAYS_AHEAD);
    case "day":
    default:
      return addDays(anchorDate, direction);
  }
}
