import api from "@/lib/api-client";
import {
  IAvailabilityRule,
  IAvailabilitySchedule,
  IEventType,
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
