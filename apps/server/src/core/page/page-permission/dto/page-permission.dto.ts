import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import { PageIdDto } from '../../dto/page.dto';

export enum PagePermissionRole {
  READER = 'reader',
  WRITER = 'writer',
}

export const PAGE_ACCESS_LEVEL_RESTRICTED = 'restricted';

export class AddPagePermissionDto extends PageIdDto {
  @IsEnum(PagePermissionRole)
  role: PagePermissionRole;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  userIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  groupIds?: string[];
}

export class RemovePagePermissionDto extends PageIdDto {
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  userIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  groupIds?: string[];
}

export class UpdatePagePermissionRoleDto extends PageIdDto {
  @IsEnum(PagePermissionRole)
  role: PagePermissionRole;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  groupId?: string;
}

export class GetPagePermissionsDto extends PaginationOptions {
  @IsString()
  @IsNotEmpty()
  pageId: string;
}
