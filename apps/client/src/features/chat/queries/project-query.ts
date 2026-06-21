import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import {
  createProject,
  createProjectTaskComment,
  createProjectTask,
  deleteProject,
  deleteProjectTask,
  deleteTaskAttachment,
  getProjectTasks,
  getProjectTaskComments,
  getProjectTaskHistory,
  getTeamProjects,
  getUserProjects,
  updateProject,
  updateProjectTask,
  uploadTaskAttachment,
} from "../services/project-service";
import {
  IProjectStatus,
  ISprint,
  ITeamProject,
  ITeamProjectTask,
  ITeamProjectTaskComment,
  ITeamProjectTaskHistoryItem,
  ProjectIssueType,
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

export function useUserProjectsQuery(): UseQueryResult<ITeamProject[], Error> {
  return useQuery({
    queryKey: [...PROJECTS_KEY, "me"],
    queryFn: getUserProjects,
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

export function useProjectTaskCommentsQuery(
  taskId?: string,
): UseQueryResult<ITeamProjectTaskComment[], Error> {
  return useQuery({
    queryKey: [...PROJECTS_KEY, "task", taskId, "comments"],
    queryFn: () => getProjectTaskComments(taskId),
    enabled: !!taskId,
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
      queryClient.invalidateQueries({ queryKey: [...PROJECTS_KEY, "me"] });
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
      logoUrl?: string | null;
      statuses?: IProjectStatus[];
      sprints?: ISprint[];
      projectTags?: string[];
    }
  >({
    mutationFn: ({ teamId: _teamId, ...data }) => updateProject(data),
    onSuccess: (_project, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...PROJECTS_KEY, "team", variables.teamId],
      });
      queryClient.invalidateQueries({ queryKey: [...PROJECTS_KEY, "me"] });
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
      queryClient.invalidateQueries({ queryKey: [...PROJECTS_KEY, "me"] });
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
      issueType?: ProjectIssueType;
      tags?: string[];
      status?: ProjectTaskStatus;
      priority?: ProjectTaskPriority;
      assigneeId?: string | null;
      sprint?: string | null;
      storyPoints?: number | null;
      externalLinks?: string[];
      dueAt?: string;
      parentTaskId?: string | null;
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
      queryClient.invalidateQueries({ queryKey: [...PROJECTS_KEY, "me"] });
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
      issueType?: ProjectIssueType;
      tags?: string[];
      status?: ProjectTaskStatus;
      priority?: ProjectTaskPriority;
      assigneeId?: string | null;
      sprint?: string | null;
      storyPoints?: number | null;
      externalLinks?: string[];
      dueAt?: string;
      parentTaskId?: string | null;
      linkedTaskIds?: string[];
      linkedPageIds?: string[];
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
      queryClient.invalidateQueries({ queryKey: [...PROJECTS_KEY, "me"] });
    },
    onError: showError,
  });
}

export function useCreateProjectTaskCommentMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    ITeamProjectTaskComment,
    Error,
    { taskId: string; projectId: string; content: string }
  >({
    mutationFn: ({ projectId: _projectId, ...data }) =>
      createProjectTaskComment(data),
    onSuccess: (_comment, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...PROJECTS_KEY, "task", variables.taskId, "comments"],
      });
      queryClient.invalidateQueries({
        queryKey: [...PROJECTS_KEY, variables.projectId, "tasks"],
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
      queryClient.invalidateQueries({ queryKey: [...PROJECTS_KEY, "me"] });
    },
    onError: showError,
  });
}

export function useUploadTaskAttachmentMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    { id: string; fileName: string; fileSize: number; mimeType: string },
    Error,
    { taskId: string; projectId: string; file: File }
  >({
    mutationFn: ({ taskId, file }) => uploadTaskAttachment(file, taskId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...PROJECTS_KEY, variables.projectId, "tasks"],
      });
    },
    onError: showError,
  });
}

export function useProjectTaskHistoryQuery(
  taskId?: string,
): UseQueryResult<ITeamProjectTaskHistoryItem[], Error> {
  return useQuery({
    queryKey: [...PROJECTS_KEY, "task", taskId, "history"],
    queryFn: () => getProjectTaskHistory(taskId!),
    enabled: !!taskId,
  });
}

export function useDeleteTaskAttachmentMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { taskId: string; projectId: string; attachmentId: string }
  >({
    mutationFn: ({ taskId, attachmentId }) =>
      deleteTaskAttachment(taskId, attachmentId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...PROJECTS_KEY, variables.projectId, "tasks"],
      });
    },
    onError: showError,
  });
}
