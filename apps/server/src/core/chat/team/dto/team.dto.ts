import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class TeamIdDto {
  @IsUUID()
  teamId: string;
}

export class CreateTeamDto {
  @IsString()
  @MaxLength(280)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsIn(['open', 'invite_only'])
  type?: string;
}

export class UpdateTeamDto extends TeamIdDto {
  @IsOptional()
  @IsString()
  @MaxLength(280)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsIn(['open', 'invite_only'])
  type?: string;
}

export class AddTeamMemberDto extends TeamIdDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsIn(['owner', 'member'])
  role?: string;
}

export class AddTeamGroupDto extends TeamIdDto {
  @IsUUID()
  groupId: string;

  @IsOptional()
  @IsIn(['owner', 'member'])
  role?: string;
}

export class RemoveTeamGroupDto extends TeamIdDto {
  @IsUUID()
  groupId: string;
}

export class RemoveTeamMemberDto extends TeamIdDto {
  @IsUUID()
  userId: string;
}

export class UpdateTeamMemberRoleDto extends TeamIdDto {
  @IsUUID()
  userId: string;

  @IsIn(['owner', 'member'])
  role: string;
}
