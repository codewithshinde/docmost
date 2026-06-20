import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const activeTeamIdAtom = atomWithStorage<string | null>(
  "chat-active-team-id",
  null,
);

const nullableString: string | null = null;

export const activeChannelIdAtom = atom(nullableString);

export const activeThreadRootIdAtom = atom(nullableString);

// channelId -> { userId -> last typing timestamp (ms) }
export const typingUsersAtom = atom<Record<string, Record<string, number>>>(
  {},
);

// userId -> isOnline
export const presenceAtom = atom<Record<string, boolean>>({});

// channelId for which the in-app call panel is currently open
export const activeCallChannelIdAtom = atom(nullableString);
