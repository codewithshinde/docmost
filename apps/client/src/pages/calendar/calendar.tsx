import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { addHours } from "date-fns";
import { LoadingOverlay } from "@mantine/core";
import { getAppName } from "@/lib/config.ts";
import { CalendarToolbar } from "@/features/calendar/components/calendar-toolbar";
import { MonthView } from "@/features/calendar/components/month-view";
import { WeekView } from "@/features/calendar/components/week-view";
import { DayView } from "@/features/calendar/components/day-view";
import { AgendaList } from "@/features/calendar/components/agenda-list";
import { EventFormModal } from "@/features/calendar/components/event-form-modal";
import { EventDetailsDrawer } from "@/features/calendar/components/event-details-drawer";
import { useCalendarEventsQuery } from "@/features/calendar/queries/calendar-query";
import { useCalendarSocket } from "@/features/calendar/hooks/use-calendar-socket";
import { ICalendarEvent } from "@/features/calendar/types/calendar.types";
import {
  CalendarViewType,
  getViewRange,
  shiftAnchorDate,
} from "@/features/calendar/utils/calendar-range";

export default function CalendarPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const initialView = (searchParams.get("view") as CalendarViewType) || "month";

  useCalendarSocket();

  const [view, setView] = useState<CalendarViewType>(initialView);
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [formOpened, setFormOpened] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ICalendarEvent | null>(null);
  const [initialRange, setInitialRange] = useState<{ start: Date; end: Date } | null>(null);
  const [defaultPrivate, setDefaultPrivate] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const { start, end } = useMemo(
    () => getViewRange(view, anchorDate),
    [view, anchorDate],
  );

  const { data: events, isLoading } = useCalendarEventsQuery(
    start.toISOString(),
    end.toISOString(),
  );

  const handlePrev = () => setAnchorDate((d) => shiftAnchorDate(view, d, -1));
  const handleNext = () => setAnchorDate((d) => shiftAnchorDate(view, d, 1));
  const handleToday = () => setAnchorDate(new Date());

  const openCreateForm = (range?: { start: Date; end: Date }, isPrivate = false) => {
    setEditingEvent(null);
    setInitialRange(range ?? null);
    setDefaultPrivate(isPrivate);
    setFormOpened(true);
  };

  const handleNewEvent = () => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const slotStart = addHours(now, 1);
    openCreateForm({ start: slotStart, end: addHours(slotStart, 1) });
  };

  const handleBlockTime = () => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const slotStart = addHours(now, 1);
    openCreateForm({ start: slotStart, end: addHours(slotStart, 1) }, true);
  };

  const handleSelectEvent = (event: ICalendarEvent) => {
    setSelectedEventId(event.id);
  };

  const handleSelectSlot = (slotStart: Date, slotEnd: Date) => {
    openCreateForm({ start: slotStart, end: slotEnd });
  };

  const handleSelectDay = (date: Date) => {
    setAnchorDate(date);
    setView("day");
  };

  const handleEdit = (event: ICalendarEvent) => {
    setSelectedEventId(null);
    setEditingEvent(event);
    setInitialRange(null);
    setDefaultPrivate(false);
    setFormOpened(true);
  };

  const closeForm = () => {
    setFormOpened(false);
    setEditingEvent(null);
    setInitialRange(null);
    setDefaultPrivate(false);
  };

  return (
    <>
      <Helmet>
        <title>
          {t("Calendar")} - {getAppName()}
        </title>
      </Helmet>

      <CalendarToolbar
        view={view}
        onViewChange={setView}
        anchorDate={anchorDate}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onNewEvent={handleNewEvent}
        onBlockTime={handleBlockTime}
      />

      <div style={{ position: "relative" }}>
        <LoadingOverlay visible={isLoading} />

        {view === "month" && (
          <MonthView
            anchorDate={anchorDate}
            events={events ?? []}
            onSelectEvent={handleSelectEvent}
            onSelectDay={handleSelectDay}
          />
        )}

        {view === "week" && (
          <WeekView
            anchorDate={anchorDate}
            events={events ?? []}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
          />
        )}

        {view === "day" && (
          <DayView
            anchorDate={anchorDate}
            events={events ?? []}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
          />
        )}

        {view === "agenda" && (
          <AgendaList events={events ?? []} onSelectEvent={handleSelectEvent} />
        )}
      </div>

      <EventFormModal
        opened={formOpened}
        onClose={closeForm}
        event={editingEvent}
        initialRange={initialRange}
        defaultPrivate={defaultPrivate}
      />

      <EventDetailsDrawer
        eventId={selectedEventId}
        opened={!!selectedEventId}
        onClose={() => setSelectedEventId(null)}
        onEdit={handleEdit}
      />
    </>
  );
}
