import { useEffect } from "react";
import { useAtom, useSetAtom } from "jotai";
import { InfiniteData, useQueryClient } from "@tanstack/react-query";
import { socketAtom } from "@/features/websocket/atoms/socket-atom";
import { CHAT_EVENT, ChatWsEvent, ChatWsMessage } from "../types/chat-ws.types";
import { IChannel, IMessage, ITeamMember } from "../types/chat.types";
import { IPagination } from "@/lib/types";
import {
  CHANNEL_MESSAGES_KEY,
  THREAD_MESSAGES_KEY,
} from "../queries/message-query";
import { CHANNELS_KEY, UNREAD_COUNTS_KEY } from "../queries/channel-query";
import { ACTIVE_CALL_KEY } from "../queries/call-query";
import { TEAMS_KEY } from "../queries/team-query";
import { presenceAtom, typingUsersAtom } from "../atoms/chat-atoms";
import { addMessageToCache } from "../utils/message-cache";

type MessagesData = InfiniteData<IPagination<IMessage>>;

export function useChatSocket() {
  const queryClient = useQueryClient();
  const [socket] = useAtom(socketAtom);
  const setTypingUsers = useSetAtom(typingUsersAtom);
  const setPresence = useSetAtom(presenceAtom);

  useEffect(() => {
    if (!socket) return;

    const handler = (data: ChatWsMessage) => {
      const { operation, channelId, payload } = data;

      switch (operation) {
        case ChatWsEvent.MESSAGE_CREATED: {
          const message = payload as IMessage;
          addMessageToCache(queryClient, message);
          queryClient.invalidateQueries({ queryKey: UNREAD_COUNTS_KEY });
          queryClient.invalidateQueries({ queryKey: CHANNELS_KEY });
          if (channelId) {
            queryClient.invalidateQueries({
              queryKey: [...CHANNELS_KEY, channelId],
            });
          }
          break;
        }

        case ChatWsEvent.MESSAGE_UPDATED: {
          const message = payload as IMessage;

          queryClient.setQueriesData<MessagesData>(
            { queryKey: [...CHANNEL_MESSAGES_KEY, channelId] },
            (old) => {
              if (!old) return old;
              const pages = old.pages.map((page) => ({
                ...page,
                items: page.items.map((item) =>
                  item.id === message.id ? { ...item, ...message } : item,
                ),
              }));
              return { ...old, pages };
            },
          );

          if (message.rootId) {
            queryClient.setQueriesData<IPagination<IMessage>>(
              { queryKey: [...THREAD_MESSAGES_KEY, message.rootId] },
              (old) => {
                if (!old) return old;
                return {
                  ...old,
                  items: old.items.map((item) =>
                    item.id === message.id ? { ...item, ...message } : item,
                  ),
                };
              },
            );
          }
          break;
        }

        case ChatWsEvent.MESSAGE_DELETED: {
          const { messageId, rootId } = payload as {
            messageId: string;
            channelId: string;
            rootId: string | null;
          };

          queryClient.setQueriesData<MessagesData>(
            { queryKey: [...CHANNEL_MESSAGES_KEY, channelId] },
            (old) => {
              if (!old) return old;
              const pages = old.pages.map((page) => ({
                ...page,
                items: page.items.map((item) =>
                  item.id === messageId
                    ? { ...item, deletedAt: new Date().toISOString(), content: null }
                    : item,
                ),
              }));
              return { ...old, pages };
            },
          );

          if (rootId) {
            queryClient.setQueriesData<IPagination<IMessage>>(
              { queryKey: [...THREAD_MESSAGES_KEY, rootId] },
              (old) => {
                if (!old) return old;
                return {
                  ...old,
                  items: old.items.map((item) =>
                    item.id === messageId
                      ? {
                          ...item,
                          deletedAt: new Date().toISOString(),
                          content: null,
                        }
                      : item,
                  ),
                };
              },
            );
          }
          break;
        }

        case ChatWsEvent.REACTION_UPDATED: {
          const { messageId, reactions, rootId } = payload as {
            messageId: string;
            channelId: string;
            rootId?: string | null;
            reactions: IMessage["reactions"];
          };

          queryClient.setQueriesData<MessagesData>(
            { queryKey: [...CHANNEL_MESSAGES_KEY, channelId] },
            (old) => {
              if (!old) return old;
              const pages = old.pages.map((page) => ({
                ...page,
                items: page.items.map((item) =>
                  item.id === messageId ? { ...item, reactions } : item,
                ),
              }));
              return { ...old, pages };
            },
          );

          if (rootId) {
            queryClient.setQueriesData<IPagination<IMessage>>(
              { queryKey: [...THREAD_MESSAGES_KEY, rootId] },
              (old) => {
                if (!old) return old;
                return {
                  ...old,
                  items: old.items.map((item) =>
                    item.id === messageId ? { ...item, reactions } : item,
                  ),
                };
              },
            );
          }
          break;
        }

        case ChatWsEvent.TYPING: {
          const { userId, isTyping } = payload as {
            userId: string;
            isTyping: boolean;
          };

          setTypingUsers((prev) => {
            const channelTyping = { ...(prev[channelId] ?? {}) };
            if (isTyping) {
              channelTyping[userId] = Date.now();
            } else {
              delete channelTyping[userId];
            }
            return { ...prev, [channelId]: channelTyping };
          });
          break;
        }

        case ChatWsEvent.PRESENCE: {
          const { userId, status, online } = payload as {
            userId: string;
            status?: "online" | "offline";
            online?: boolean;
          };

          const isOnline =
            typeof online === "boolean" ? online : status === "online";
          setPresence((prev) => ({ ...prev, [userId]: isOnline }));
          break;
        }

        case ChatWsEvent.CALL_STARTED:
        case ChatWsEvent.CALL_ENDED:
        case ChatWsEvent.CALL_PARTICIPANT_JOINED:
        case ChatWsEvent.CALL_PARTICIPANT_LEFT:
        case ChatWsEvent.CALL_PARTICIPANT_UPDATED: {
          if (channelId) {
            queryClient.invalidateQueries({
              queryKey: [...ACTIVE_CALL_KEY, channelId],
            });
          }
          break;
        }

        case ChatWsEvent.CHANNEL_CREATED:
        case ChatWsEvent.CHANNEL_UPDATED: {
          const channel = payload as IChannel;
          queryClient.invalidateQueries({ queryKey: CHANNELS_KEY });
          if (channel?.id) {
            queryClient.invalidateQueries({
              queryKey: [...CHANNELS_KEY, channel.id],
            });
          }
          break;
        }

        case ChatWsEvent.CHANNEL_ARCHIVED:
        case ChatWsEvent.CHANNEL_MEMBER_ADDED:
        case ChatWsEvent.CHANNEL_MEMBER_REMOVED: {
          queryClient.invalidateQueries({ queryKey: CHANNELS_KEY });
          if (channelId) {
            queryClient.invalidateQueries({
              queryKey: [...CHANNELS_KEY, channelId, "members"],
            });
          }
          break;
        }

        case ChatWsEvent.CHANNEL_READ: {
          queryClient.invalidateQueries({ queryKey: UNREAD_COUNTS_KEY });
          break;
        }

        case ChatWsEvent.TEAM_MEMBER_ADDED:
        case ChatWsEvent.TEAM_MEMBER_REMOVED: {
          const { teamId } = data;
          const member = payload as ITeamMember;
          queryClient.invalidateQueries({ queryKey: TEAMS_KEY });
          if (teamId || member?.teamId) {
            queryClient.invalidateQueries({
              queryKey: [...TEAMS_KEY, teamId ?? member.teamId, "members"],
            });
          }
          queryClient.invalidateQueries({ queryKey: CHANNELS_KEY });
          break;
        }

        default:
          break;
      }
    };

    socket.on(CHAT_EVENT, handler);
    return () => {
      socket.off(CHAT_EVENT, handler);
    };
  }, [socket, queryClient, setTypingUsers, setPresence]);
}
