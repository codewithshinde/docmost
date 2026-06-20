import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';

export class AuditLogParamsDto extends PaginationOptions {
  @IsOptional()
  @IsString()
  event?: string;

  @IsOptional()
  @IsString()
  resourceType?: string;

  @IsOptional()
  @IsString()
  actorId?: string;

  @IsOptional()
  @IsString()
  spaceId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class UpdateAuditRetentionDto {
  @IsInt()
  @Min(1)
  @Max(3650)
  auditRetentionDays: number;
}
