import { IChannel, IChatUser } from "../types/chat.types";

export function getChannelDisplayName(
  channel: IChannel,
  currentUserId: string,
  members?: IChatUser[],
): string {
  if (channel.name) {
    return channel.name;
  }

  const participants = (members ?? channel.members ?? []).filter(
    (member) => member.id !== currentUserId,
  );

  if (participants.length === 0) {
    return "You";
  }

  return participants.map((participant) => participant.name).join(", ");
}

export function getDmParticipants(
  channel: IChannel,
  currentUserId: string,
  members?: IChatUser[],
): IChatUser[] {
  return (members ?? channel.members ?? []).filter(
    (member) => member.id !== currentUserId,
  );
}
