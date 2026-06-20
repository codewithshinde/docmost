import { InfiniteData, QueryClient } from "@tanstack/react-query";
import { IPagination } from "@/lib/types";
import { IMessage } from "../types/chat.types";
import {
  CHANNEL_MESSAGES_KEY,
  THREAD_MESSAGES_KEY,
} from "../queries/message-query";
import { CHANNELS_KEY, UNREAD_COUNTS_KEY } from "../queries/channel-query";

type MessagesData = InfiniteData<IPagination<IMessage>>;

export function addMessageToCache(queryClient: QueryClient, message: IMessage) {
  if (message.rootId) {
    queryClient.setQueriesData<IPagination<IMessage>>(
      { queryKey: [...THREAD_MESSAGES_KEY, message.rootId] },
      (old) => {
        if (!old) return old;
        if (old.items.some((item) => item.id === message.id)) {
          return old;
        }
        return { ...old, items: [...old.items, message] };
      },
    );

    queryClient.setQueriesData<MessagesData>(
      { queryKey: [...CHANNEL_MESSAGES_KEY, message.channelId] },
      (old) => {
        if (!old) return old;
        const pages = old.pages.map((page) => ({
          ...page,
          items: page.items.map((item) =>
            item.id === message.rootId
              ? { ...item, replyCount: (item.replyCount ?? 0) + 1 }
              : item,
          ),
        }));
        return { ...old, pages };
      },
    );
  } else {
    queryClient.setQueriesData<MessagesData>(
      { queryKey: [...CHANNEL_MESSAGES_KEY, message.channelId] },
      (old) => {
        if (!old) return old;
        const pages = [...old.pages];
        if (pages.length === 0) return old;
        if (pages[0].items.some((item) => item.id === message.id)) {
          return old;
        }
        pages[0] = {
          ...pages[0],
          items: [message, ...pages[0].items],
        };
        return { ...old, pages };
      },
    );
  }

  queryClient.invalidateQueries({ queryKey: UNREAD_COUNTS_KEY });
  queryClient.invalidateQueries({ queryKey: CHANNELS_KEY });
}
