import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { InviteUserRole } from '../../../common/helpers/types/permission';
import { NoUrls } from '../../../common/validators/no-urls.validator';

export class CreateMemberDto {
  @MinLength(2)
  @MaxLength(60)
  @IsString()
  @NoUrls()
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message:
      'Username can only contain letters, numbers, underscores, dots and hyphens',
  })
  username?: string;

  @MinLength(8)
  @IsString()
  password: string;

  @IsEnum(InviteUserRole)
  role: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(25, {
    message: 'you cannot add a user to more than 25 groups at a time',
  })
  @ArrayMinSize(0)
  @IsUUID('all', { each: true })
  groupIds?: string[];
}
