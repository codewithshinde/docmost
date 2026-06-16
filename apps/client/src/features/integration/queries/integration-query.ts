import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import {
  getCallSettings,
  getMailSettings,
  updateCallSettings,
  updateMailSettings,
} from "../services/integration-service";
import {
  ICallSettingsView,
  IMailSettingsView,
  IUpdateCallSettings,
  IUpdateMailSettings,
} from "../types/integration.types";
import { CALL_CONFIG_KEY } from "@/features/chat/queries/call-query";

export const CALL_SETTINGS_KEY = ["integrations", "calls"];
export const MAIL_SETTINGS_KEY = ["integrations", "mail"];

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
    onSuccess: (settings) => {
      queryClient.invalidateQueries({ queryKey: CALL_SETTINGS_KEY });
      queryClient.setQueryData(CALL_CONFIG_KEY, settings.effective);
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

export function useMailSettingsQuery(): UseQueryResult<
  IMailSettingsView,
  Error
> {
  return useQuery({
    queryKey: MAIL_SETTINGS_KEY,
    queryFn: getMailSettings,
  });
}

export function useUpdateMailSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation<IMailSettingsView, Error, IUpdateMailSettings>({
    mutationFn: updateMailSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MAIL_SETTINGS_KEY });
      notifications.show({ message: "Mail settings saved", color: "green" });
    },
    onError: (error: any) => {
      notifications.show({
        message: error?.response?.data?.message ?? "Failed to save settings",
        color: "red",
      });
    },
  });
}
