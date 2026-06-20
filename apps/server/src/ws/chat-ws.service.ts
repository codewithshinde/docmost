import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { WsService } from './ws.service';
import {
  CHAT_EVENT,
  getCallRoomName,
  getChannelRoomName,
  getTeamRoomName,
  getUserRoomName,
} from './ws.utils';
import { ChatWsEventName } from './chat-ws.constants';

@Injectable()
export class ChatWsService {
  constructor(private readonly wsService: WsService) {}

  private get server(): Server | undefined {
    return this.wsService.getServer();
  }

  emitToChannel(
    channelId: string,
    operation: ChatWsEventName,
    payload: unknown,
  ): void {
    this.server
      ?.to(getChannelRoomName(channelId))
      .emit(CHAT_EVENT, { operation, channelId, payload });
  }

  emitToTeam(
    teamId: string,
    operation: ChatWsEventName,
    payload: unknown,
  ): void {
    this.server
      ?.to(getTeamRoomName(teamId))
      .emit(CHAT_EVENT, { operation, teamId, payload });
  }

  emitToCall(
    callId: string,
    operation: ChatWsEventName,
    payload: unknown,
  ): void {
    this.server
      ?.to(getCallRoomName(callId))
      .emit(CHAT_EVENT, { operation, callId, payload });
  }

  emitToUsers(
    userIds: string[],
    operation: ChatWsEventName,
    payload: unknown,
  ): void {
    if (!userIds.length || !this.server) return;
    const rooms = userIds.map((id) => getUserRoomName(id));
    this.server.to(rooms).emit(CHAT_EVENT, { operation, payload });
  }

  async addUserToChannel(userId: string, channelId: string): Promise<void> {
    await this.joinRoom(userId, getChannelRoomName(channelId));
  }

  async removeUserFromChannel(
    userId: string,
    channelId: string,
  ): Promise<void> {
    await this.leaveRoom(userId, getChannelRoomName(channelId));
  }

  async addUserToTeam(userId: string, teamId: string): Promise<void> {
    await this.joinRoom(userId, getTeamRoomName(teamId));
  }

  async removeUserFromTeam(userId: string, teamId: string): Promise<void> {
    await this.leaveRoom(userId, getTeamRoomName(teamId));
  }

  async addUserToCall(userId: string, callId: string): Promise<void> {
    await this.joinRoom(userId, getCallRoomName(callId));
  }

  async removeUserFromCall(userId: string, callId: string): Promise<void> {
    await this.leaveRoom(userId, getCallRoomName(callId));
  }

  private async joinRoom(userId: string, room: string): Promise<void> {
    if (!this.server) return;
    const sockets = await this.server
      .in(getUserRoomName(userId))
      .fetchSockets();
    for (const socket of sockets) {
      socket.join(room);
    }
  }

  private async leaveRoom(userId: string, room: string): Promise<void> {
    if (!this.server) return;
    const sockets = await this.server
      .in(getUserRoomName(userId))
      .fetchSockets();
    for (const socket of sockets) {
      socket.leave(room);
    }
  }
}
