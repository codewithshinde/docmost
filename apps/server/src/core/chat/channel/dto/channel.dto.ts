import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationOptions } from '@likh/db/pagination/pagination-options';

export class ChannelIdDto {
  @IsUUID()
  channelId: string;
}

export class TeamChannelsDto {
  @IsUUID()
  teamId: string;
}

export class CreateChannelDto {
  @IsUUID()
  teamId: string;

  @IsString()
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsIn(['public', 'private'])
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  topic?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  purpose?: string;
}

export class UpdateChannelDto extends ChannelIdDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  topic?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  purpose?: string;
}

export class CreateDirectChannelDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  userIds: string[];
}

export class AddChannelMemberDto extends ChannelIdDto {
  @IsUUID()
  userId: string;
}

export class RemoveChannelMemberDto extends ChannelIdDto {
  @IsUUID()
  userId: string;
}

export class UpdateChannelMemberSettingsDto extends ChannelIdDto {
  @IsOptional()
  @IsIn(['all', 'mentions', 'none'])
  notifyLevel?: string;

  @IsOptional()
  @IsBoolean()
  muted?: boolean;
}

export class MarkChannelReadDto extends ChannelIdDto {
  @IsUUID()
  messageId: string;
}

export class GetChannelMessagesDto extends PaginationOptions {
  @IsUUID()
  channelId: string;
}
