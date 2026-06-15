import api from "@/lib/api-client";
import {
  IAvailabilityRule,
  IAvailabilitySchedule,
  IBooking,
  IEventType,
  ISlot,
} from "../types/scheduling.types";

export async function listSchedules(): Promise<IAvailabilitySchedule[]> {
  const req = await api.post<IAvailabilitySchedule[]>("/scheduling/schedules");
  return req.data;
}

export async function saveSchedule(data: {
  name: string;
  timeZone: string;
  rules: IAvailabilityRule[];
}): Promise<IAvailabilitySchedule> {
  const req = await api.post<IAvailabilitySchedule>(
    "/scheduling/schedules/save",
    data,
  );
  return req.data;
}

export async function listEventTypes(): Promise<IEventType[]> {
  const req = await api.post<IEventType[]>("/scheduling/event-types");
  return req.data;
}

export async function createEventType(data: {
  name: string;
  slug?: string;
  description?: string;
  scheduleId?: string;
  durationMinutes: number;
  minimumNoticeMinutes?: number;
}): Promise<IEventType> {
  const req = await api.post<IEventType>(
    "/scheduling/event-types/create",
    data,
  );
  return req.data;
}

export async function listMyBookings(data: {
  start: string;
  end: string;
}): Promise<IBooking[]> {
  const req = await api.post<IBooking[]>("/scheduling/bookings", data);
  return req.data;
}

export async function listEventTypesForUser(
  userId: string,
): Promise<IEventType[]> {
  const req = await api.post<IEventType[]>("/scheduling/event-types/user", {
    userId,
  });
  return req.data;
}

export async function getSlots(data: {
  eventTypeId: string;
  start: string;
  end: string;
}): Promise<ISlot[]> {
  const req = await api.post<ISlot[]>("/scheduling/slots", data);
  return req.data;
}

export async function createBooking(data: {
  eventTypeId: string;
  startsAt: string;
  bookerName: string;
  bookerEmail: string;
  notes?: string;
}): Promise<IBooking> {
  const req = await api.post<IBooking>("/scheduling/bookings/create", data);
  return req.data;
}
