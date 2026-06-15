import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEventById,
  getCalendarEvents,
  ICreateCalendarEventParams,
  IRespondCalendarEventParams,
  IUpdateCalendarEventParams,
  respondToCalendarEvent,
  updateCalendarEvent,
} from "../services/calendar-service";
import { ICalendarEvent } from "../types/calendar.types";

export const CALENDAR_EVENTS_KEY = ["calendar", "events"];

export function useCalendarEventsQuery(
  start: string,
  end: string,
): UseQueryResult<ICalendarEvent[], Error> {
  return useQuery({
    queryKey: [...CALENDAR_EVENTS_KEY, start, end],
    queryFn: () => getCalendarEvents({ start, end }),
    enabled: !!start && !!end,
  });
}

export function useCalendarEventQuery(
  eventId?: string,
): UseQueryResult<ICalendarEvent, Error> {
  return useQuery({
    queryKey: [...CALENDAR_EVENTS_KEY, eventId],
    queryFn: () => getCalendarEventById(eventId),
    enabled: !!eventId,
  });
}

export function useCreateCalendarEventMutation() {
  const queryClient = useQueryClient();

  return useMutation<ICalendarEvent, Error, ICreateCalendarEventParams>({
    mutationFn: createCalendarEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CALENDAR_EVENTS_KEY });
    },
    onError: (error: any) => {
      notifications.show({
        message: error?.response?.data?.message,
        color: "red",
      });
    },
  });
}

export function useUpdateCalendarEventMutation() {
  const queryClient = useQueryClient();

  return useMutation<ICalendarEvent, Error, IUpdateCalendarEventParams>({
    mutationFn: updateCalendarEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CALENDAR_EVENTS_KEY });
    },
    onError: (error: any) => {
      notifications.show({
        message: error?.response?.data?.message,
        color: "red",
      });
    },
  });
}

export function useDeleteCalendarEventMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteCalendarEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CALENDAR_EVENTS_KEY });
    },
    onError: (error: any) => {
      notifications.show({
        message: error?.response?.data?.message,
        color: "red",
      });
    },
  });
}

export function useRespondCalendarEventMutation() {
  const queryClient = useQueryClient();

  return useMutation<ICalendarEvent, Error, IRespondCalendarEventParams>({
    mutationFn: respondToCalendarEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CALENDAR_EVENTS_KEY });
    },
    onError: (error: any) => {
      notifications.show({
        message: error?.response?.data?.message,
        color: "red",
      });
    },
  });
}
