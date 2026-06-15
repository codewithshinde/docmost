import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class TeamProjectIdDto {
  @IsUUID()
  projectId: string;
}

export class TeamProjectTaskIdDto {
  @IsUUID()
  taskId: string;
}

export class CreateTeamProjectDto {
  @IsUUID()
  teamId: string;

  @IsString()
  @MaxLength(280)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsIn(['table', 'kanban', 'calendar'])
  view?: string;
}

export class UpdateTeamProjectDto extends TeamProjectIdDto {
  @IsOptional()
  @IsString()
  @MaxLength(280)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsIn(['table', 'kanban', 'calendar'])
  view?: string;
}

export class CreateTeamProjectTaskDto extends TeamProjectIdDto {
  @IsString()
  @MaxLength(500)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsIn(['todo', 'in_progress', 'blocked', 'done'])
  status?: string;

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;

  @IsOptional()
  @IsDateString()
  dueAt?: string;
}

export class UpdateTeamProjectTaskDto extends TeamProjectTaskIdDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsIn(['todo', 'in_progress', 'blocked', 'done'])
  status?: string;

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;

  @IsOptional()
  @IsDateString()
  dueAt?: string;
}
