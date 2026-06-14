import {
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class ListTemplatesDto {
  @IsOptional()
  @IsUUID()
  spaceId?: string;
}

export class TemplateIdDto {
  @IsUUID()
  templateId: string;
}

export class CreateTemplateDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  content?: object;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsUUID()
  spaceId?: string;
}

export class UpdateTemplateDto {
  @IsUUID()
  templateId: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  content?: object;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @ValidateIf((o) => o.spaceId !== null)
  @IsUUID()
  spaceId?: string | null;
}

export class UseTemplateDto {
  @IsUUID()
  templateId: string;

  @IsUUID()
  spaceId: string;

  @IsOptional()
  @IsString()
  parentPageId?: string;
}
