import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import {
  addTeamMember,
  addTeamGroup,
  createTeam,
  deleteTeam,
  getTeamById,
  getTeamGroups,
  getTeamMembers,
  getTeams,
  joinTeam,
  leaveTeam,
  removeTeamMember,
  removeTeamGroup,
  updateTeam,
  updateTeamMemberRole,
} from "../services/team-service";
import { ITeam, ITeamGroup, ITeamMember } from "../types/chat.types";
import { notifications } from "@mantine/notifications";

export const TEAMS_KEY = ["chat", "teams"];

export function useTeamsQuery(): UseQueryResult<ITeam[], Error> {
  return useQuery({
    queryKey: TEAMS_KEY,
    queryFn: getTeams,
  });
}

export function useTeamQuery(teamId?: string): UseQueryResult<ITeam, Error> {
  return useQuery({
    queryKey: [...TEAMS_KEY, teamId],
    queryFn: () => getTeamById(teamId),
    enabled: !!teamId,
  });
}

export function useCreateTeamMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    ITeam,
    Error,
    { name: string; description?: string; type?: string }
  >({
    mutationFn: createTeam,
    onSuccess: (team) => {
      queryClient.setQueryData([...TEAMS_KEY, team.id], team);
      queryClient.invalidateQueries({ queryKey: TEAMS_KEY });
    },
    onError: (error: any) => {
      notifications.show({
        message: error?.response?.data?.message,
        color: "red",
      });
    },
  });
}

export function useUpdateTeamMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    ITeam,
    Error,
    { teamId: string; name?: string; description?: string; type?: string }
  >({
    mutationFn: updateTeam,
    onSuccess: (team, variables) => {
      queryClient.setQueryData([...TEAMS_KEY, variables.teamId], team);
      queryClient.invalidateQueries({ queryKey: TEAMS_KEY });
    },
    onError: (error: any) => {
      notifications.show({
        message: error?.response?.data?.message,
        color: "red",
      });
    },
  });
}

export function useDeleteTeamMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteTeam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEAMS_KEY });
    },
    onError: (error: any) => {
      notifications.show({
        message: error?.response?.data?.message,
        color: "red",
      });
    },
  });
}

export function useTeamMembersQuery(
  teamId?: string,
): UseQueryResult<ITeamMember[], Error> {
  return useQuery({
    queryKey: [...TEAMS_KEY, teamId, "members"],
    queryFn: () => getTeamMembers(teamId),
    enabled: !!teamId,
  });
}

export function useTeamGroupsQuery(
  teamId?: string,
): UseQueryResult<ITeamGroup[], Error> {
  return useQuery({
    queryKey: [...TEAMS_KEY, teamId, "groups"],
    queryFn: () => getTeamGroups(teamId),
    enabled: !!teamId,
  });
}

export function useAddTeamMemberMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    ITeamMember,
    Error,
    { teamId: string; userId: string; role?: string }
  >({
    mutationFn: addTeamMember,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...TEAMS_KEY, variables.teamId],
      });
      queryClient.invalidateQueries({
        queryKey: [...TEAMS_KEY, variables.teamId, "members"],
      });
      queryClient.invalidateQueries({ queryKey: TEAMS_KEY });
    },
    onError: (error: any) => {
      notifications.show({
        message: error?.response?.data?.message,
        color: "red",
      });
    },
  });
}

export function useRemoveTeamMemberMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { teamId: string; userId: string }>({
    mutationFn: removeTeamMember,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...TEAMS_KEY, variables.teamId],
      });
      queryClient.invalidateQueries({
        queryKey: [...TEAMS_KEY, variables.teamId, "members"],
      });
      queryClient.invalidateQueries({ queryKey: TEAMS_KEY });
    },
    onError: (error: any) => {
      notifications.show({
        message: error?.response?.data?.message,
        color: "red",
      });
    },
  });
}

export function useUpdateTeamMemberRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    ITeamMember,
    Error,
    { teamId: string; userId: string; role: string }
  >({
    mutationFn: updateTeamMemberRole,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...TEAMS_KEY, variables.teamId],
      });
      queryClient.invalidateQueries({
        queryKey: [...TEAMS_KEY, variables.teamId, "members"],
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

export function useAddTeamGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    ITeamGroup,
    Error,
    { teamId: string; groupId: string; role?: string }
  >({
    mutationFn: addTeamGroup,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...TEAMS_KEY, variables.teamId, "groups"],
      });
      queryClient.invalidateQueries({
        queryKey: [...TEAMS_KEY, variables.teamId, "members"],
      });
      queryClient.invalidateQueries({ queryKey: TEAMS_KEY });
    },
    onError: (error: any) => {
      notifications.show({
        message: error?.response?.data?.message,
        color: "red",
      });
    },
  });
}

export function useRemoveTeamGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { teamId: string; groupId: string }>({
    mutationFn: removeTeamGroup,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...TEAMS_KEY, variables.teamId, "groups"],
      });
      queryClient.invalidateQueries({
        queryKey: [...TEAMS_KEY, variables.teamId, "members"],
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

export function useJoinTeamMutation() {
  const queryClient = useQueryClient();

  return useMutation<ITeamMember, Error, string>({
    mutationFn: joinTeam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEAMS_KEY });
    },
    onError: (error: any) => {
      notifications.show({
        message: error?.response?.data?.message,
        color: "red",
      });
    },
  });
}

export function useLeaveTeamMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: leaveTeam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEAMS_KEY });
    },
    onError: (error: any) => {
      notifications.show({
        message: error?.response?.data?.message,
        color: "red",
      });
    },
  });
}
