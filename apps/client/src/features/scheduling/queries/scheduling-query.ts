import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import {
  createEventType,
  listEventTypes,
  listSchedules,
  saveSchedule,
} from "../services/scheduling-service";

export const SCHEDULES_KEY = ["scheduling", "schedules"];
export const EVENT_TYPES_KEY = ["scheduling", "event-types"];

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
