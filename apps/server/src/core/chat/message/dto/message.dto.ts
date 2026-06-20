import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';

export class MessageIdDto {
  @IsUUID()
  messageId: string;
}

export class GetChannelMessagesDto extends PaginationOptions {
  @IsUUID()
  channelId: string;
}

export class GetThreadMessagesDto extends PaginationOptions {
  @IsUUID()
  rootId: string;
}

export class SendMessageDto {
  @IsUUID()
  channelId: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  content?: string;

  @IsOptional()
  @IsUUID()
  rootId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  attachmentIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  mentionUserIds?: string[];
}

export class UpdateMessageDto extends MessageIdDto {
  @IsString()
  @MaxLength(20000)
  content: string;
}
