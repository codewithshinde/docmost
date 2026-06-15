import { useAtomValue } from "jotai";
import { CustomAvatar } from "@/components/ui/custom-avatar";
import { IChatUser } from "../types/chat.types";
import { presenceAtom } from "../atoms/chat-atoms";
import classes from "./presence-indicator.module.css";

interface PresenceIndicatorProps {
  userId?: string | null;
  size?: number;
}

export function PresenceIndicator({ userId, size = 10 }: PresenceIndicatorProps) {
  const presence = useAtomValue(presenceAtom);
  if (!userId) return null;
  const online = !!presence[userId];
  return (
    <span
      className={classes.dot}
      data-online={online || undefined}
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}

interface AvatarWithPresenceProps {
  user?: IChatUser | null;
  name: string;
  size?: number;
  dotSize?: number;
}

export function AvatarWithPresence({
  user,
  name,
  size = 18,
  dotSize = 9,
}: AvatarWithPresenceProps) {
  return (
    <span
      className={classes.wrapper}
      style={{ width: size, height: size }}
    >
      <CustomAvatar
        avatarUrl={user?.avatarUrl}
        name={name}
        size={size}
        radius="xl"
      />
      <span className={classes.dotAnchor}>
        <PresenceIndicator userId={user?.id} size={dotSize} />
      </span>
    </span>
  );
}
