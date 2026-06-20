import { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import { typingUsersAtom } from "../atoms/chat-atoms";
import { useChannelMembersQuery } from "../queries/channel-query";
import classes from "./message-composer.module.css";

const STALE_AFTER_MS = 5000;

interface TypingIndicatorProps {
  channelId: string;
  currentUserId?: string;
}

export function TypingIndicator({ channelId, currentUserId }: TypingIndicatorProps) {
  const { t } = useTranslation();
  const typingUsers = useAtomValue(typingUsersAtom);
  const { data: members } = useChannelMembersQuery(channelId);
  const [, forceTick] = useState(0);

  const channelTyping = typingUsers[channelId] ?? {};

  useEffect(() => {
    const interval = setInterval(() => forceTick((tick) => tick + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const now = Date.now();
  const activeUserIds = Object.entries(channelTyping)
    .filter(([userId, timestamp]) => userId !== currentUserId && now - timestamp < STALE_AFTER_MS)
    .map(([userId]) => userId);

  if (activeUserIds.length === 0) {
    return <div className={classes.typingIndicator} />;
  }

  const names = activeUserIds
    .map((userId) => members?.find((member) => member.userId === userId)?.user?.name)
    .filter(Boolean);

  const label =
    names.length === 0
      ? t("Someone is typing...")
      : names.length === 1
        ? t("{{name}} is typing...", { name: names[0] })
        : t("Several people are typing...");

  return <div className={classes.typingIndicator}>{label}</div>;
}
