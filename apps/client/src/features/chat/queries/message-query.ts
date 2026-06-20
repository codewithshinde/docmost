import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import {
  deleteMessage,
  getChannelMessages,
  getMessageById,
  getThreadMessages,
  sendMessage,
  updateMessage,
} from "../services/message-service";
import { IMessage } from "../types/chat.types";
import { IPagination } from "@/lib/types";
import { notifications } from "@mantine/notifications";
import { addMessageToCache } from "../utils/message-cache";

export const CHANNEL_MESSAGES_KEY = ["chat", "channel-messages"];
export const THREAD_MESSAGES_KEY = ["chat", "thread-messages"];

export function useChannelMessagesQuery(channelId?: string) {
  return useInfiniteQuery<IPagination<IMessage>, Error>({
    queryKey: [...CHANNEL_MESSAGES_KEY, channelId],
    queryFn: ({ pageParam }) =>
      getChannelMessages({ channelId, cursor: pageParam as string }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNextPage ? lastPage.meta.nextCursor : undefined,
    enabled: !!channelId,
  });
}

export function useThreadMessagesQuery(
  rootId?: string,
): UseQueryResult<IPagination<IMessage>, Error> {
  return useQuery({
    queryKey: [...THREAD_MESSAGES_KEY, rootId],
    queryFn: () => getThreadMessages({ rootId, limit: 100 }),
    enabled: !!rootId,
  });
}

export function useMessageQuery(
  messageId?: string,
): UseQueryResult<IMessage, Error> {
  return useQuery({
    queryKey: ["chat", "message", messageId],
    queryFn: () => getMessageById(messageId),
    enabled: !!messageId,
  });
}

export function useSendMessageMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    IMessage,
    Error,
    {
      channelId: string;
      content?: string;
      rootId?: string;
      attachmentIds?: string[];
      mentionUserIds?: string[];
    }
  >({
    mutationFn: sendMessage,
    onSuccess: (data) => {
      addMessageToCache(queryClient, data);
    },
    onError: (error: any) => {
      notifications.show({
        message: error?.response?.data?.message,
        color: "red",
      });
    },
  });
}

export function useUpdateMessageMutation() {
  const queryClient = useQueryClient();

  return useMutation<IMessage, Error, { messageId: string; content: string }>({
    mutationFn: updateMessage,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [...CHANNEL_MESSAGES_KEY, data.channelId],
      });
      if (data.rootId) {
        queryClient.invalidateQueries({
          queryKey: [...THREAD_MESSAGES_KEY, data.rootId],
        });
      }
    },
    onError: (error: any) => {
      notifications.show({
        message: error?.response?.data?.message,
        color: "red",
      });
    },
  });
}

export function useDeleteMessageMutation() {
  const queryClient = useQueryClient();

  return useMutation<IMessage, Error, string>({
    mutationFn: deleteMessage,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [...CHANNEL_MESSAGES_KEY, data.channelId],
      });
      if (data.rootId) {
        queryClient.invalidateQueries({
          queryKey: [...THREAD_MESSAGES_KEY, data.rootId],
        });
      }
    },
    onError: (error: any) => {
      notifications.show({
        message: error?.response?.data?.message,
        color: "red",
      });
    },
  });
}
