import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addReaction, removeReaction } from "../services/reaction-service";
import { IMessageReaction } from "../types/chat.types";
import { notifications } from "@mantine/notifications";
import { CHANNEL_MESSAGES_KEY } from "./message-query";

export function useAddReactionMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    IMessageReaction[],
    Error,
    { messageId: string; emoji: string; channelId: string }
  >({
    mutationFn: addReaction,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...CHANNEL_MESSAGES_KEY, variables.channelId],
      });
    },
    onError: (error: any) => {
      notifications.show({
        message: error?.response?.data?.message,
        color: "red",
      });
    },
  });
}

export function useRemoveReactionMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    IMessageReaction[],
    Error,
    { messageId: string; emoji: string; channelId: string }
  >({
    mutationFn: removeReaction,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...CHANNEL_MESSAGES_KEY, variables.channelId],
      });
    },
    onError: (error: any) => {
      notifications.show({
        message: error?.response?.data?.message,
        color: "red",
      });
    },
  });
}
