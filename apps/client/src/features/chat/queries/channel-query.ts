import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import {
  addChannelMember,
  archiveChannel,
  createChannel,
  createDirectChannel,
  getChannelById,
  getChannelMembers,
  getDirectChannels,
  getTeamChannels,
  getUnreadCounts,
  joinChannel,
  leaveChannel,
  markChannelRead,
  removeChannelMember,
  updateChannel,
  updateChannelMemberSettings,
} from "../services/channel-service";
import { IChannel, IChannelMember, IUnreadCount } from "../types/chat.types";
import { notifications } from "@mantine/notifications";

export const CHANNELS_KEY = ["chat", "channels"];
export const UNREAD_COUNTS_KEY = ["chat", "unread-counts"];

export function useTeamChannelsQuery(
  teamId?: string,
): UseQueryResult<IChannel[], Error> {
  return useQuery({
    queryKey: [...CHANNELS_KEY, "team", teamId],
    queryFn: () => getTeamChannels(teamId),
    enabled: !!teamId,
  });
}

export function useDirectChannelsQuery(): UseQueryResult<IChannel[], Error> {
  return useQuery({
    queryKey: [...CHANNELS_KEY, "direct"],
    queryFn: getDirectChannels,
  });
}

export function useChannelQuery(
  channelId?: string,
): UseQueryResult<IChannel, Error> {
  return useQuery({
    queryKey: [...CHANNELS_KEY, channelId],
    queryFn: () => getChannelById(channelId),
    enabled: !!channelId,
  });
}

export function useCreateChannelMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    IChannel,
    Error,
    {
      teamId: string;
      name: string;
      type?: string;
      topic?: string;
      purpose?: string;
    }
  >({
    mutationFn: createChannel,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...CHANNELS_KEY, "team", variables.teamId],
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

export function useCreateDirectChannelMutation() {
  const queryClient = useQueryClient();

  return useMutation<IChannel, Error, { userIds: string[] }>({
    mutationFn: createDirectChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...CHANNELS_KEY, "direct"],
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

export function useUpdateChannelMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    IChannel,
    Error,
    { channelId: string; name?: string; topic?: string; purpose?: string }
  >({
    mutationFn: updateChannel,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...CHANNELS_KEY, data.id] });
      queryClient.invalidateQueries({
        queryKey: [...CHANNELS_KEY, "team", data.teamId],
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

export function useArchiveChannelMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: archiveChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHANNELS_KEY });
    },
    onError: (error: any) => {
      notifications.show({
        message: error?.response?.data?.message,
        color: "red",
      });
    },
  });
}

export function useJoinChannelMutation() {
  const queryClient = useQueryClient();

  return useMutation<IChannelMember, Error, string>({
    mutationFn: joinChannel,
    onSuccess: (_data, channelId) => {
      queryClient.invalidateQueries({ queryKey: CHANNELS_KEY });
      queryClient.invalidateQueries({
        queryKey: [...CHANNELS_KEY, channelId, "members"],
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

export function useLeaveChannelMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: leaveChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHANNELS_KEY });
    },
    onError: (error: any) => {
      notifications.show({
        message: error?.response?.data?.message,
        color: "red",
      });
    },
  });
}

export function useChannelMembersQuery(
  channelId?: string,
): UseQueryResult<IChannelMember[], Error> {
  return useQuery({
    queryKey: [...CHANNELS_KEY, channelId, "members"],
    queryFn: () => getChannelMembers(channelId),
    enabled: !!channelId,
  });
}

export function useAddChannelMemberMutation() {
  const queryClient = useQueryClient();

  return useMutation<IChannelMember, Error, { channelId: string; userId: string }>({
    mutationFn: addChannelMember,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...CHANNELS_KEY, variables.channelId, "members"],
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

export function useRemoveChannelMemberMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { channelId: string; userId: string }>({
    mutationFn: removeChannelMember,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...CHANNELS_KEY, variables.channelId, "members"],
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

export function useUpdateChannelMemberSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    IChannelMember,
    Error,
    { channelId: string; notifyLevel?: string; muted?: boolean }
  >({
    mutationFn: updateChannelMemberSettings,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...CHANNELS_KEY, variables.channelId, "members"],
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

export function useMarkChannelReadMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { channelId: string; messageId: string }>({
    mutationFn: markChannelRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNTS_KEY });
    },
  });
}

export function useUnreadCountsQuery(): UseQueryResult<IUnreadCount[], Error> {
  return useQuery({
    queryKey: UNREAD_COUNTS_KEY,
    queryFn: getUnreadCounts,
  });
}
