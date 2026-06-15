import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';
import { CallProvider } from '../integration.constants';

export class UpdateCallSettingsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsIn(['livekit', 'jitsi'])
  provider?: CallProvider;

  @IsOptional()
  @IsString()
  livekitUrl?: string;

  @IsOptional()
  @IsString()
  livekitApiKey?: string;

  @IsOptional()
  @IsString()
  livekitApiSecret?: string;

  @IsOptional()
  @IsString()
  jitsiDomain?: string;

  @IsOptional()
  @IsString()
  jitsiAppId?: string;

  @IsOptional()
  @IsString()
  jitsiAppSecret?: string;
}

export class UpdateMailSettingsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsIn(['smtp', 'postmark', 'sendgrid', 'mailgun', 'ses', 'log'])
  provider?: string;

  @IsOptional()
  @IsString()
  fromAddress?: string;

  @IsOptional()
  @IsString()
  fromName?: string;

  @IsOptional()
  @IsString()
  smtpHost?: string;

  @IsOptional()
  smtpPort?: number;

  @IsOptional()
  @IsBoolean()
  smtpSecure?: boolean;

  @IsOptional()
  @IsBoolean()
  smtpIgnoreTls?: boolean;

  @IsOptional()
  @IsString()
  smtpUsername?: string;

  @IsOptional()
  @IsString()
  smtpPassword?: string;

  @IsOptional()
  @IsString()
  postmarkToken?: string;

  @IsOptional()
  @IsString()
  sendgridApiKey?: string;

  @IsOptional()
  @IsString()
  mailgunApiKey?: string;

  @IsOptional()
  @IsString()
  mailgunDomain?: string;

  @IsOptional()
  @IsString()
  mailgunApiBaseUrl?: string;

  @IsOptional()
  @IsString()
  sesAccessKeyId?: string;

  @IsOptional()
  @IsString()
  sesSecretAccessKey?: string;

  @IsOptional()
  @IsString()
  sesRegion?: string;
}
