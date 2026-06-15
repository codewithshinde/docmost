import { IsBoolean, IsUUID } from 'class-validator';

export class ChannelCallDto {
  @IsUUID()
  channelId: string;
}

export class CallIdDto {
  @IsUUID()
  callId: string;
}

export class CallScreenShareDto extends CallIdDto {
  @IsBoolean()
  screenSharing: boolean;
}
