import api from "@/lib/api-client";
import {
  ITeamProject,
  ITeamProjectTask,
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
  status?: ProjectTaskStatus;
  priority?: ProjectTaskPriority;
  assigneeId?: string | null;
  dueAt?: string;
}): Promise<ITeamProjectTask> {
  const req = await api.post<ITeamProjectTask>("/projects/tasks/create", data);
  return req.data;
}

export async function updateProjectTask(data: {
  taskId: string;
  title?: string;
  description?: string;
  status?: ProjectTaskStatus;
  priority?: ProjectTaskPriority;
  assigneeId?: string | null;
  dueAt?: string;
}): Promise<ITeamProjectTask> {
  const req = await api.post<ITeamProjectTask>("/projects/tasks/update", data);
  return req.data;
}

export async function deleteProjectTask(taskId: string): Promise<void> {
  await api.post("/projects/tasks/delete", { taskId });
}
