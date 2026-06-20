import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccessToken, RoomServiceClient, VideoGrant } from 'livekit-server-sdk';
import * as jwt from 'jsonwebtoken';
import { CallRepo } from '@docmost/db/repos/chat/call.repo';
import { CallParticipantRepo } from '@docmost/db/repos/chat/call-participant.repo';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { ChannelService } from '../channel/channel.service';
import { ChatWsService } from '../../../ws/chat-ws.service';
import { ChatWsEvent } from '../../../ws/chat-ws.constants';
import { IntegrationSettingsService } from '../../../integrations/integration/integration-settings.service';
import { CallRuntimeConfig } from '../../../integrations/integration/integration.constants';
import { CallScreenShareDto } from './dto/call.dto';

@Injectable()
export class CallService {
  constructor(
    private readonly callRepo: CallRepo,
    private readonly callParticipantRepo: CallParticipantRepo,
    private readonly channelService: ChannelService,
    private readonly chatWsService: ChatWsService,
    private readonly integrationSettingsService: IntegrationSettingsService,
  ) {}

  async getConfig(workspace: Workspace) {
    const runtime = await this.integrationSettingsService.getCallRuntimeConfig(
      workspace.id,
    );
    return this.integrationSettingsService.toPublicCallConfig(runtime);
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

    const runtime = await this.integrationSettingsService.getCallRuntimeConfig(
      workspace.id,
    );

    if (!runtime.enabled || !runtime.configured) {
      throw new BadRequestException(
        'Calls are not configured on this server',
      );
    }

    let call = await this.callRepo.findActiveCallForChannel(channelId);
    const isNewCall = !call;

    if (!call) {
      await this.callRepo.insertCall({
        workspaceId: workspace.id,
        channelId: channel.id,
        startedById: user.id,
        status: 'active',
        provider: runtime.provider,
        roomName: `${workspace.id}-${channel.id}`,
      });
      call = await this.callRepo.findActiveCallForChannel(channelId);
    }

    const existingParticipant =
      await this.callParticipantRepo.getActiveParticipant(call.id, user.id);

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

    const token = await this.generateToken(runtime, call.roomName, user);

    return {
      call,
      provider: runtime.provider,
      token,
      livekitUrl: runtime.livekitUrl,
      jitsiDomain: runtime.jitsiDomain,
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

    const activeParticipants =
      await this.callParticipantRepo.getActiveParticipants(call.id);

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

  async testConnection(workspace: Workspace) {
    const runtime = await this.integrationSettingsService.getCallRuntimeConfig(
      workspace.id,
    );

    if (runtime.provider === 'livekit') {
      if (
        !runtime.livekitUrl ||
        !runtime.livekitApiKey ||
        !runtime.livekitApiSecret
      ) {
        return { ok: false, message: 'Missing LiveKit URL, API key or secret' };
      }
      try {
        const httpUrl = runtime.livekitUrl.replace(/^ws/i, 'http');
        const client = new RoomServiceClient(
          httpUrl,
          runtime.livekitApiKey,
          runtime.livekitApiSecret,
        );
        await client.listRooms();
        return { ok: true, message: 'Successfully connected to LiveKit' };
      } catch (err) {
        return {
          ok: false,
          message:
            err instanceof Error
              ? err.message
              : 'Failed to connect to LiveKit',
        };
      }
    }

    // jitsi
    if (!runtime.jitsiDomain) {
      return { ok: false, message: 'Missing Jitsi domain' };
    }
    return {
      ok: true,
      message: `Jitsi is configured (${runtime.jitsiDomain})`,
    };
  }

  private async generateToken(
    runtime: CallRuntimeConfig,
    roomName: string,
    user: User,
  ): Promise<string | null> {
    if (runtime.provider === 'livekit') {
      if (!runtime.livekitApiKey || !runtime.livekitApiSecret) {
        throw new BadRequestException('Calls are not configured on this server');
      }

      const at = new AccessToken(
        runtime.livekitApiKey,
        runtime.livekitApiSecret,
        {
          identity: user.id,
          name: user.name,
          ttl: '10m',
        },
      );

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

    // jitsi: only needs a signed JWT when an app id + secret are configured
    // (self-hosted with auth or JaaS). Otherwise anonymous join is used.
    if (runtime.jitsiAppId && runtime.jitsiAppSecret) {
      const now = Math.floor(Date.now() / 1000);
      return jwt.sign(
        {
          aud: 'jitsi',
          iss: runtime.jitsiAppId,
          sub: runtime.jitsiDomain ?? '*',
          room: roomName,
          iat: now,
          exp: now + 60 * 60,
          context: {
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
            },
          },
        },
        runtime.jitsiAppSecret,
        { algorithm: 'HS256' },
      );
    }

    return null;
  }
}
