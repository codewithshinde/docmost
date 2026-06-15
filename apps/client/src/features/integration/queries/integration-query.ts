import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import {
  getCallSettings,
  updateCallSettings,
} from "../services/integration-service";
import {
  ICallSettingsView,
  IUpdateCallSettings,
} from "../types/integration.types";
import { CALL_CONFIG_KEY } from "@/features/chat/queries/call-query";

export const CALL_SETTINGS_KEY = ["integrations", "calls"];

export function useCallSettingsQuery(): UseQueryResult<
  ICallSettingsView,
  Error
> {
  return useQuery({
    queryKey: CALL_SETTINGS_KEY,
    queryFn: getCallSettings,
  });
}

export function useUpdateCallSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation<ICallSettingsView, Error, IUpdateCallSettings>({
    mutationFn: updateCallSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CALL_SETTINGS_KEY });
      // refresh the gating used by the chat call button
      queryClient.invalidateQueries({ queryKey: CALL_CONFIG_KEY });
      notifications.show({ message: "Call settings saved", color: "green" });
    },
    onError: (error: any) => {
      notifications.show({
        message: error?.response?.data?.message ?? "Failed to save settings",
        color: "red",
      });
    },
  });
}
