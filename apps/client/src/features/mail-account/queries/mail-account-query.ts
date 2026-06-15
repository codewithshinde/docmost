import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import {
  deleteMailAccount,
  getMailAccount,
  getMailMessage,
  listMailMessages,
  saveMailAccount,
} from "../services/mail-account-service";
import {
  IListMailMessages,
  IMailAccountView,
  IMailMessageDetail,
  IMailMessageListResult,
  ISaveMailAccount,
} from "../types/mail-account.types";

export const MAIL_ACCOUNT_KEY = ["mailAccount"];

export function useMailAccountQuery(): UseQueryResult<
  IMailAccountView,
  Error
> {
  return useQuery({
    queryKey: MAIL_ACCOUNT_KEY,
    queryFn: getMailAccount,
  });
}

export function useSaveMailAccountMutation() {
  const queryClient = useQueryClient();
  return useMutation<IMailAccountView, Error, ISaveMailAccount>({
    mutationFn: saveMailAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MAIL_ACCOUNT_KEY });
      notifications.show({ message: "Email account saved", color: "green" });
    },
    onError: (error: any) => {
      notifications.show({
        message:
          error?.response?.data?.message ?? "Failed to save email account",
        color: "red",
      });
    },
  });
}

export function useDeleteMailAccountMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: deleteMailAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MAIL_ACCOUNT_KEY });
      notifications.show({
        message: "Email account removed",
        color: "green",
      });
    },
    onError: (error: any) => {
      notifications.show({
        message:
          error?.response?.data?.message ?? "Failed to remove email account",
        color: "red",
      });
    },
  });
}

export function useMailMessagesQuery(
  params: IListMailMessages,
  enabled: boolean,
): UseQueryResult<IMailMessageListResult, Error> {
  return useQuery({
    queryKey: ["mailMessages", params],
    queryFn: () => listMailMessages(params),
    enabled,
  });
}

export function useMailMessageQuery(
  uid: number | null,
): UseQueryResult<IMailMessageDetail, Error> {
  return useQuery({
    queryKey: ["mailMessage", uid],
    queryFn: () => getMailMessage(uid as number),
    enabled: uid !== null,
  });
}
