import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsArray,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class TeamProjectIdDto {
  @IsUUID()
  projectId: string;
}

export class TeamProjectTaskIdDto {
  @IsUUID()
  taskId: string;
}

export class DeleteTaskAttachmentDto {
  @IsUUID()
  taskId: string;

  @IsUUID()
  attachmentId: string;
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
  @IsIn(['task', 'bug', 'story', 'epic'])
  issueType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

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
  @IsString()
  @MaxLength(120)
  sprint?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  storyPoints?: number | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  externalLinks?: string[];

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
  @IsIn(['task', 'bug', 'story', 'epic'])
  issueType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

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
  @IsString()
  @MaxLength(120)
  sprint?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  storyPoints?: number | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  externalLinks?: string[];

  @IsOptional()
  @IsDateString()
  dueAt?: string;
}

export class CreateTeamProjectTaskCommentDto extends TeamProjectTaskIdDto {
  @IsString()
  @MaxLength(4000)
  content: string;
}
