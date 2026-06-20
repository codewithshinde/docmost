import api from "@/lib/api-client";
import {
  IProjectStatus,
  ISprint,
  ITeamProject,
  ITeamProjectTask,
  ITeamProjectTaskComment,
  ProjectIssueType,
  ProjectTaskPriority,
  ProjectTaskStatus,
  ProjectView,
} from "../types/chat.types";

export async function getTeamProjects(teamId: string): Promise<ITeamProject[]> {
  const req = await api.post<ITeamProject[]>("/projects/team", { teamId });
  return req.data;
}

export async function getUserProjects(): Promise<ITeamProject[]> {
  const req = await api.post<ITeamProject[]>("/projects");
  return req.data;
}

export async function createProject(data: {
  teamId: string;
  name: string;
  description?: string;
  view?: ProjectView;
}): Promise<ITeamProject> {
  const req = await api.post<ITeamProject>("/projects/create", data);
  return req.data;
}

export async function updateProject(data: {
  projectId: string;
  name?: string;
  description?: string;
  view?: ProjectView;
  logoUrl?: string | null;
  statuses?: IProjectStatus[];
  sprints?: ISprint[];
  projectTags?: string[];
}): Promise<ITeamProject> {
  const req = await api.post<ITeamProject>("/projects/update", data);
  return req.data;
}

export async function deleteProject(projectId: string): Promise<void> {
  await api.post("/projects/delete", { projectId });
}

export async function getProjectTasks(
  projectId: string,
): Promise<ITeamProjectTask[]> {
  const req = await api.post<ITeamProjectTask[]>("/projects/tasks", {
    projectId,
  });
  return req.data;
}

export async function createProjectTask(data: {
  projectId: string;
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
}): Promise<ITeamProjectTask> {
  const req = await api.post<ITeamProjectTask>("/projects/tasks/create", data);
  return req.data;
}

export async function updateProjectTask(data: {
  taskId: string;
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
}): Promise<ITeamProjectTask> {
  const req = await api.post<ITeamProjectTask>("/projects/tasks/update", data);
  return req.data;
}

export async function deleteProjectTask(taskId: string): Promise<void> {
  await api.post("/projects/tasks/delete", { taskId });
}

export async function getProjectTaskComments(
  taskId: string,
): Promise<ITeamProjectTaskComment[]> {
  const req = await api.post<ITeamProjectTaskComment[]>(
    "/projects/tasks/comments",
    { taskId },
  );
  return req.data;
}

export async function createProjectTaskComment(data: {
  taskId: string;
  content: string;
}): Promise<ITeamProjectTaskComment> {
  const req = await api.post<ITeamProjectTaskComment>(
    "/projects/tasks/comments/create",
    data,
  );
  return req.data;
}

export async function uploadTaskAttachment(
  file: File,
  taskId: string,
): Promise<{ id: string; fileName: string; fileSize: number; mimeType: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("taskId", taskId);
  const req = await api.post("/attachments/task-upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return req as unknown as { id: string; fileName: string; fileSize: number; mimeType: string };
}

export async function deleteTaskAttachment(
  taskId: string,
  attachmentId: string,
): Promise<void> {
  await api.post("/projects/tasks/attachments/delete", { taskId, attachmentId });
}
