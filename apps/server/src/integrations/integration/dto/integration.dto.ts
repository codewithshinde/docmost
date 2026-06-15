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
