import api from "@/lib/api-client";
import { ICalendarEvent } from "../types/calendar.types";

export interface IListCalendarEventsParams {
  start: string;
  end: string;
}

export interface ICreateCalendarEventParams {
  title: string;
  description?: string;
  location?: string;
  startsAt: string;
  endsAt: string;
  allDay?: boolean;
  visibility?: "default" | "private";
  addVideoCall?: boolean;
  color?: string;
  attendeeUserIds?: string[];
}

export interface IUpdateCalendarEventParams
  extends Partial<ICreateCalendarEventParams> {
  eventId: string;
}

export interface IRespondCalendarEventParams {
  eventId: string;
  responseStatus: "accepted" | "declined" | "tentative";
}

export async function getCalendarEvents(
  params: IListCalendarEventsParams,
): Promise<ICalendarEvent[]> {
  const req = await api.post<ICalendarEvent[]>("/calendar/events", params);
  return req.data;
}

export async function getCalendarEventById(
  eventId: string,
): Promise<ICalendarEvent> {
  const req = await api.post<ICalendarEvent>("/calendar/events/get", {
    eventId,
  });
  return req.data;
}

export async function createCalendarEvent(
  data: ICreateCalendarEventParams,
): Promise<ICalendarEvent> {
  const req = await api.post<ICalendarEvent>("/calendar/events/create", data);
  return req.data;
}

export async function updateCalendarEvent(
  data: IUpdateCalendarEventParams,
): Promise<ICalendarEvent> {
  const req = await api.post<ICalendarEvent>("/calendar/events/update", data);
  return req.data;
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  await api.post("/calendar/events/delete", { eventId });
}

export async function respondToCalendarEvent(
  data: IRespondCalendarEventParams,
): Promise<ICalendarEvent> {
  const req = await api.post<ICalendarEvent>("/calendar/events/respond", data);
  return req.data;
}

export async function syncCalendarFromImap(): Promise<{
  synced: number;
  skipped: number;
}> {
  const req = await api.post<{ synced: number; skipped: number }>(
    "/calendar/events/sync-imap",
  );
  return req.data;
}
