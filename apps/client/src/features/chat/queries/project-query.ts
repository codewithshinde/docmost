import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import {
  createProject,
  createProjectTask,
  deleteProject,
  deleteProjectTask,
  getProjectTasks,
  getTeamProjects,
  updateProject,
  updateProjectTask,
} from "../services/project-service";
import {
  ITeamProject,
  ITeamProjectTask,
  ProjectTaskPriority,
  ProjectTaskStatus,
  ProjectView,
} from "../types/chat.types";

export const PROJECTS_KEY = ["chat", "projects"];

function showError(error: any) {
  notifications.show({
    message: error?.response?.data?.message,
    color: "red",
  });
}

export function useTeamProjectsQuery(
  teamId?: string,
): UseQueryResult<ITeamProject[], Error> {
  return useQuery({
    queryKey: [...PROJECTS_KEY, "team", teamId],
    queryFn: () => getTeamProjects(teamId),
    enabled: !!teamId,
  });
}

export function useProjectTasksQuery(
  projectId?: string,
): UseQueryResult<ITeamProjectTask[], Error> {
  return useQuery({
    queryKey: [...PROJECTS_KEY, projectId, "tasks"],
    queryFn: () => getProjectTasks(projectId),
    enabled: !!projectId,
  });
}

export function useCreateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    ITeamProject,
    Error,
    { teamId: string; name: string; description?: string; view?: ProjectView }
  >({
    mutationFn: createProject,
    onSuccess: (_project, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...PROJECTS_KEY, "team", variables.teamId],
      });
    },
    onError: showError,
  });
}

export function useUpdateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    ITeamProject,
    Error,
    {
      projectId: string;
      name?: string;
      description?: string;
      view?: ProjectView;
      teamId: string;
    }
  >({
    mutationFn: ({ teamId: _teamId, ...data }) => updateProject(data),
    onSuccess: (_project, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...PROJECTS_KEY, "team", variables.teamId],
      });
    },
    onError: showError,
  });
}

export function useDeleteProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { projectId: string; teamId: string }>({
    mutationFn: ({ projectId }) => deleteProject(projectId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...PROJECTS_KEY, "team", variables.teamId],
      });
    },
    onError: showError,
  });
}

export function useCreateProjectTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    ITeamProjectTask,
    Error,
    {
      projectId: string;
      teamId: string;
      title: string;
      description?: string;
      status?: ProjectTaskStatus;
      priority?: ProjectTaskPriority;
      assigneeId?: string | null;
      dueAt?: string;
    }
  >({
    mutationFn: ({ teamId: _teamId, ...data }) => createProjectTask(data),
    onSuccess: (_task, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...PROJECTS_KEY, variables.projectId, "tasks"],
      });
      queryClient.invalidateQueries({
        queryKey: [...PROJECTS_KEY, "team", variables.teamId],
      });
    },
    onError: showError,
  });
}

export function useUpdateProjectTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    ITeamProjectTask,
    Error,
    {
      taskId: string;
      projectId: string;
      teamId: string;
      title?: string;
      description?: string;
      status?: ProjectTaskStatus;
      priority?: ProjectTaskPriority;
      assigneeId?: string | null;
      dueAt?: string;
    }
  >({
    mutationFn: ({ projectId: _projectId, teamId: _teamId, ...data }) =>
      updateProjectTask(data),
    onSuccess: (_task, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...PROJECTS_KEY, variables.projectId, "tasks"],
      });
      queryClient.invalidateQueries({
        queryKey: [...PROJECTS_KEY, "team", variables.teamId],
      });
    },
    onError: showError,
  });
}

export function useDeleteProjectTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { taskId: string; projectId: string; teamId: string }
  >({
    mutationFn: ({ taskId }) => deleteProjectTask(taskId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...PROJECTS_KEY, variables.projectId, "tasks"],
      });
      queryClient.invalidateQueries({
        queryKey: [...PROJECTS_KEY, "team", variables.teamId],
      });
    },
    onError: showError,
  });
}
