import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import {
  createBooking,
  createEventType,
  getSlots,
  listEventTypes,
  listEventTypesForUser,
  listMyBookings,
  listSchedules,
  saveSchedule,
} from "../services/scheduling-service";

export const SCHEDULES_KEY = ["scheduling", "schedules"];
export const EVENT_TYPES_KEY = ["scheduling", "event-types"];
export const MY_BOOKINGS_KEY = ["scheduling", "my-bookings"];
export const USER_EVENT_TYPES_KEY = ["scheduling", "event-types", "user"];
export const SLOTS_KEY = ["scheduling", "slots"];

export function useSchedulesQuery() {
  return useQuery({ queryKey: SCHEDULES_KEY, queryFn: listSchedules });
}

export function useEventTypesQuery() {
  return useQuery({ queryKey: EVENT_TYPES_KEY, queryFn: listEventTypes });
}

export function useSaveScheduleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULES_KEY });
      notifications.show({ message: "Schedule saved", color: "green" });
    },
  });
}

export function useCreateEventTypeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEventType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EVENT_TYPES_KEY });
      notifications.show({ message: "Event type created", color: "green" });
    },
  });
}

export function useMyBookingsQuery(start: string, end: string) {
  return useQuery({
    queryKey: [...MY_BOOKINGS_KEY, start, end],
    queryFn: () => listMyBookings({ start, end }),
  });
}

export function useUserEventTypesQuery(userId: string | null) {
  return useQuery({
    queryKey: [...USER_EVENT_TYPES_KEY, userId],
    queryFn: () => listEventTypesForUser(userId as string),
    enabled: !!userId,
  });
}

export function useSlotsQuery(
  eventTypeId: string | null,
  start: string,
  end: string,
) {
  return useQuery({
    queryKey: [...SLOTS_KEY, eventTypeId, start, end],
    queryFn: () => getSlots({ eventTypeId: eventTypeId as string, start, end }),
    enabled: !!eventTypeId,
  });
}

export function useCreateBookingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_BOOKINGS_KEY });
      queryClient.invalidateQueries({ queryKey: SLOTS_KEY });
      notifications.show({ message: "Booking confirmed", color: "green" });
    },
    onError: (error: any) => {
      notifications.show({
        message:
          error?.response?.data?.message ?? "Failed to create booking",
        color: "red",
      });
    },
  });
}
