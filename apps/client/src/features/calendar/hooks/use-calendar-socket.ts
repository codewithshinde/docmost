import { useEffect } from "react";
import { useAtom } from "jotai";
import { useQueryClient } from "@tanstack/react-query";
import { socketAtom } from "@/features/websocket/atoms/socket-atom";
import {
  CHAT_EVENT,
  ChatWsEvent,
  ChatWsMessage,
} from "@/features/chat/types/chat-ws.types";
import { CALENDAR_EVENTS_KEY } from "../queries/calendar-query";

export function useCalendarSocket() {
  const queryClient = useQueryClient();
  const [socket] = useAtom(socketAtom);

  useEffect(() => {
    if (!socket) return;

    const handler = (data: ChatWsMessage) => {
      const { operation } = data;

      switch (operation) {
        case ChatWsEvent.CALENDAR_EVENT_CREATED:
        case ChatWsEvent.CALENDAR_EVENT_UPDATED:
        case ChatWsEvent.CALENDAR_EVENT_CANCELLED:
        case ChatWsEvent.CALENDAR_EVENT_RESPONSE_UPDATED: {
          queryClient.invalidateQueries({ queryKey: CALENDAR_EVENTS_KEY });
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
  }, [socket, queryClient]);
}
