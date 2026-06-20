import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class AddReactionDto {
  @IsUUID()
  messageId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  emoji: string;
}

export class RemoveReactionDto extends AddReactionDto {}
