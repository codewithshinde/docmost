import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import {
  addTeamMember,
  createTeam,
  deleteTeam,
  getTeamById,
  getTeamMembers,
  getTeams,
  joinTeam,
  leaveTeam,
  removeTeamMember,
  updateTeam,
  updateTeamMemberRole,
} from "../services/team-service";
import { ITeam, ITeamMember } from "../types/chat.types";
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
