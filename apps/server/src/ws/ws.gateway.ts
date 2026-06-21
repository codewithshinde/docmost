import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TokenService } from '../core/auth/services/token.service';
import { JwtPayload, JwtType } from '../core/auth/dto/jwt-payload';
import { OnModuleDestroy } from '@nestjs/common';
import { SpaceMemberRepo } from '@likh/db/repos/space/space-member.repo';
import { TeamMemberRepo } from '@likh/db/repos/chat/team-member.repo';
import { ChannelRepo } from '@likh/db/repos/chat/channel.repo';
import { WsService } from './ws.service';
import {
  CHAT_EVENT,
  getChannelRoomName,
  getSpaceRoomName,
  getTeamRoomName,
  getUserRoomName,
} from './ws.utils';
import { ChatWsEvent } from './chat-ws.constants';
import * as cookie from 'cookie';

@WebSocketGateway({
  cors: { origin: '*' },
  transports: ['websocket'],
})
export class WsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  constructor(
    private tokenService: TokenService,
    private spaceMemberRepo: SpaceMemberRepo,
    private teamMemberRepo: TeamMemberRepo,
    private channelRepo: ChannelRepo,
    private wsService: WsService,
  ) {}

  afterInit(server: Server): void {
    this.wsService.setServer(server);
  }

  async handleConnection(client: Socket, ...args: any[]): Promise<void> {
    try {
      const cookies = cookie.parse(client.handshake.headers.cookie);
      const token: JwtPayload = await this.tokenService.verifyJwt(
        cookies['authToken'],
        JwtType.ACCESS,
      );

      const userId = token.sub;
      const workspaceId = token.workspaceId;

      client.data.userId = userId;
      client.data.workspaceId = workspaceId;

      const [userSpaceIds, userTeamIds, userChannelIds] = await Promise.all([
        this.spaceMemberRepo.getUserSpaceIds(userId),
        this.teamMemberRepo.getUserTeamIds(userId),
        this.channelRepo.getUserChannelIds(userId),
      ]);

      const userRoom = getUserRoomName(userId);
      const workspaceRoom = `workspace-${workspaceId}`;
      const spaceRooms = userSpaceIds.map((id) => getSpaceRoomName(id));
      const teamRooms = userTeamIds.map((id) => getTeamRoomName(id));
      const channelRooms = userChannelIds.map((id) => getChannelRoomName(id));

      client.join([
        userRoom,
        workspaceRoom,
        ...spaceRooms,
        ...teamRooms,
        ...channelRooms,
      ]);

      this.server.to(workspaceRoom).emit(CHAT_EVENT, {
        operation: ChatWsEvent.PRESENCE,
        payload: { userId, status: 'online' },
      });
    } catch (err) {
      client.emit('Unauthorized');
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const userId = client.data?.userId;
    const workspaceId = client.data?.workspaceId;

    if (!userId || !workspaceId) {
      return;
    }

    const remainingSockets = await this.server
      .in(getUserRoomName(userId))
      .fetchSockets();

    if (remainingSockets.length === 0) {
      this.server.to(`workspace-${workspaceId}`).emit(CHAT_EVENT, {
        operation: ChatWsEvent.PRESENCE,
        payload: { userId, status: 'offline' },
      });
    }
  }

  @SubscribeMessage('message')
  async handleMessage(client: Socket, data: any): Promise<void> {
    if (this.wsService.isTreeEvent(data)) {
      await this.wsService.handleTreeEvent(client, data);
    }
  }

  @SubscribeMessage('chat.typing')
  handleTyping(
    client: Socket,
    data: { channelId: string; isTyping: boolean },
  ): void {
    const room = getChannelRoomName(data?.channelId);
    if (!data?.channelId || !client.rooms.has(room)) {
      return;
    }

    client.broadcast.to(room).emit(CHAT_EVENT, {
      operation: ChatWsEvent.TYPING,
      channelId: data.channelId,
      payload: { userId: client.data.userId, isTyping: !!data.isTyping },
    });
  }

  /*
  @SubscribeMessage('join-room')
  handleJoinRoom(client: Socket, @MessageBody() roomName: string): void {
    // if room is a space, check if user has permissions
    //client.join(roomName);
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(client: Socket, @MessageBody() roomName: string): void {
    client.leave(roomName);
  }
 */

  onModuleDestroy() {
    if (this.server) {
      this.server.close();
    }
  }
}
