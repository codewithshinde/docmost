import api from "@/lib/api-client";
import { ITeam, ITeamMember } from "../types/chat.types";

export async function getTeams(): Promise<ITeam[]> {
  const req = await api.post<ITeam[]>("/teams");
  return req.data;
}

export async function getTeamById(teamId: string): Promise<ITeam> {
  const req = await api.post<ITeam>("/teams/info", { teamId });
  return req.data;
}

export async function createTeam(data: {
  name: string;
  description?: string;
  type?: string;
}): Promise<ITeam> {
  const req = await api.post<ITeam>("/teams/create", data);
  return req.data;
}

export async function updateTeam(data: {
  teamId: string;
  name?: string;
  description?: string;
  type?: string;
}): Promise<ITeam> {
  const req = await api.post<ITeam>("/teams/update", data);
  return req.data;
}

export async function deleteTeam(teamId: string): Promise<void> {
  await api.post("/teams/delete", { teamId });
}

export async function getTeamMembers(teamId: string): Promise<ITeamMember[]> {
  const req = await api.post<ITeamMember[]>("/teams/members", { teamId });
  return req.data;
}

export async function addTeamMember(data: {
  teamId: string;
  userId: string;
  role?: string;
}): Promise<ITeamMember> {
  const req = await api.post<ITeamMember>("/teams/members/add", data);
  return req.data;
}

export async function removeTeamMember(data: {
  teamId: string;
  userId: string;
}): Promise<void> {
  await api.post("/teams/members/remove", data);
}

export async function updateTeamMemberRole(data: {
  teamId: string;
  userId: string;
  role: string;
}): Promise<ITeamMember> {
  const req = await api.post<ITeamMember>("/teams/members/update-role", data);
  return req.data;
}

export async function joinTeam(teamId: string): Promise<ITeamMember> {
  const req = await api.post<ITeamMember>("/teams/join", { teamId });
  return req.data;
}

export async function leaveTeam(teamId: string): Promise<void> {
  await api.post("/teams/leave", { teamId });
}
