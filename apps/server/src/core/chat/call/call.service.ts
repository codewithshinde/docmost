import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccessToken, VideoGrant } from 'livekit-server-sdk';
import { CallRepo } from '@docmost/db/repos/chat/call.repo';
import { CallParticipantRepo } from '@docmost/db/repos/chat/call-participant.repo';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { ChannelService } from '../channel/channel.service';
import { ChatWsService } from '../../../ws/chat-ws.service';
import { ChatWsEvent } from '../../../ws/chat-ws.constants';
import { EnvironmentService } from '../../../integrations/environment/environment.service';
import { CallScreenShareDto } from './dto/call.dto';

@Injectable()
export class CallService {
  constructor(
    private readonly callRepo: CallRepo,
    private readonly callParticipantRepo: CallParticipantRepo,
    private readonly channelService: ChannelService,
    private readonly chatWsService: ChatWsService,
    private readonly environmentService: EnvironmentService,
  ) {}

  getConfig() {
    const url = this.environmentService.getLiveKitUrl();
    const apiKey = this.environmentService.getLiveKitApiKey();
    const apiSecret = this.environmentService.getLiveKitApiSecret();
    return {
      provider: 'livekit',
      enabled: Boolean(url && apiKey && apiSecret),
      livekitUrl: url ?? null,
    };
  }

  async getActiveCall(channelId: string, user: User, workspace: Workspace) {
    await this.channelService.getChannelById(channelId, user, workspace);
    const call = await this.callRepo.findActiveCallForChannel(channelId);
    return call ?? null;
  }

  async joinCall(channelId: string, user: User, workspace: Workspace) {
    const channel = await this.channelService.getChannelById(
      channelId,
      user,
      workspace,
    );

    let call = await this.callRepo.findActiveCallForChannel(channelId);
    const isNewCall = !call;

    if (!call) {
      await this.callRepo.insertCall({
        workspaceId: workspace.id,
        channelId: channel.id,
        startedById: user.id,
        status: 'active',
        provider: 'livekit',
        roomName: channel.id,
      });
      call = await this.callRepo.findActiveCallForChannel(channelId);
    }

    const existingParticipant = await this.callParticipantRepo.getActiveParticipant(
      call.id,
      user.id,
    );

    if (!existingParticipant) {
      await this.callParticipantRepo.insertParticipant({
        callId: call.id,
        userId: user.id,
      });
    }

    await this.chatWsService.addUserToCall(user.id, call.id);

    call = await this.callRepo.findActiveCallForChannel(channelId);

    if (isNewCall) {
      this.chatWsService.emitToChannel(channelId, ChatWsEvent.CALL_STARTED, {
        call,
      });
    }

    if (!existingParticipant) {
      this.chatWsService.emitToChannel(
        channelId,
        ChatWsEvent.CALL_PARTICIPANT_JOINED,
        { callId: call.id, userId: user.id },
      );
    }

    const token = await this.generateToken(call.roomName, user);

    return {
      call,
      token,
      livekitUrl: this.environmentService.getLiveKitUrl(),
    };
  }

  async leaveCall(callId: string, user: User, workspace: Workspace) {
    const call = await this.callRepo.findById(callId, workspace.id);
    if (!call) {
      throw new NotFoundException('Call not found');
    }

    await this.callParticipantRepo.markLeft(call.id, user.id);
    await this.chatWsService.removeUserFromCall(user.id, call.id);

    this.chatWsService.emitToChannel(
      call.channelId,
      ChatWsEvent.CALL_PARTICIPANT_LEFT,
      { callId: call.id, userId: user.id },
    );

    const activeParticipants = await this.callParticipantRepo.getActiveParticipants(
      call.id,
    );

    if (activeParticipants.length === 0 && call.status === 'active') {
      await this.callRepo.endCall(call.id, workspace.id);

      this.chatWsService.emitToChannel(call.channelId, ChatWsEvent.CALL_ENDED, {
        callId: call.id,
      });
    }

    return { success: true };
  }

  async setScreenSharing(
    dto: CallScreenShareDto,
    user: User,
    workspace: Workspace,
  ) {
    const call = await this.callRepo.findById(dto.callId, workspace.id);
    if (!call) {
      throw new NotFoundException('Call not found');
    }

    await this.callParticipantRepo.setScreenSharing(
      call.id,
      user.id,
      dto.screenSharing,
    );

    this.chatWsService.emitToChannel(
      call.channelId,
      ChatWsEvent.CALL_PARTICIPANT_UPDATED,
      { callId: call.id, userId: user.id, screenSharing: dto.screenSharing },
    );

    return { success: true };
  }

  private async generateToken(roomName: string, user: User): Promise<string> {
    const apiKey = this.environmentService.getLiveKitApiKey();
    const apiSecret = this.environmentService.getLiveKitApiSecret();

    if (!apiKey || !apiSecret) {
      throw new BadRequestException(
        'Calls are not configured on this server',
      );
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      name: user.name,
      ttl: '10m',
    });

    const grant: VideoGrant = {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    };

    at.addGrant(grant);

    return at.toJwt();
  }
}
