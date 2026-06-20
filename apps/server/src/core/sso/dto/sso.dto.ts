import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';

export enum SsoProviderType {
  SAML = 'saml',
  OIDC = 'oidc',
  GOOGLE = 'google',
  LDAP = 'ldap',
}

export class CreateSsoProviderDto {
  @IsEnum(SsoProviderType)
  type: SsoProviderType;

  @IsString()
  @MinLength(1)
  name: string;
}

export class UpdateSsoProviderDto {
  @IsString()
  providerId: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  oidcIssuer?: string;

  @IsOptional()
  @IsString()
  oidcClientId?: string;

  @IsOptional()
  @IsString()
  oidcClientSecret?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  allowSignup?: boolean;

  @IsOptional()
  @IsBoolean()
  groupSync?: boolean;
}

export class SsoProviderIdDto {
  @IsOptional()
  @IsString()
  providerId?: string;
}

export class DeleteSsoProviderDto {
  @IsString()
  providerId: string;
}
