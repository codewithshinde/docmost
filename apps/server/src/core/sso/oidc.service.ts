import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import type * as OpenIdClient from 'openid-client';
import { EnvironmentService } from '../../integrations/environment/environment.service';
import { AuthProvider } from '@docmost/db/types/entity.types';
import { loadOpenIdClient } from './oidc-client.loader';

const OIDC_SCOPE = 'openid email profile';
const FLOW_TOKEN_TTL = '10m';

interface OidcFlowState {
  providerId: string;
  state: string;
  codeVerifier?: string;
  redirect?: string;
}

@Injectable()
export class OidcService {
  private readonly logger = new Logger(OidcService.name);

  constructor(private readonly environmentService: EnvironmentService) {}

  buildCallbackUrl(providerId: string): string {
    return `${this.environmentService.getAppUrl()}/api/sso/oidc/${providerId}/callback`;
  }

  private async discover(
    provider: AuthProvider,
  ): Promise<OpenIdClient.Configuration> {
    const oidc = await loadOpenIdClient();

    const issuerUrl = new URL(provider.oidcIssuer);
    const options: { execute?: Array<(config: any) => void> } = {};

    // Allow plain-HTTP issuers for local development / on-prem IdPs.
    if (issuerUrl.protocol === 'http:') {
      options.execute = [oidc.allowInsecureRequests];
    }

    try {
      return await oidc.discovery(
        issuerUrl,
        provider.oidcClientId,
        provider.oidcClientSecret,
        undefined,
        options,
      );
    } catch (err: any) {
      this.logger.error(
        `OIDC discovery failed for issuer ${provider.oidcIssuer}: ${err?.message}`,
      );
      throw new BadRequestException(
        'Unable to reach the OIDC provider. Check the issuer URL and credentials.',
      );
    }
  }

  /**
   * Build the authorization request URL and an opaque, signed flow token that
   * carries the PKCE verifier / state across the redirect to the IdP.
   */
  async createAuthorizationRequest(
    provider: AuthProvider,
    redirect?: string,
  ): Promise<{ authorizationUrl: string; flowToken: string }> {
    const oidc = await loadOpenIdClient();
    const config = await this.discover(provider);

    const state = oidc.randomState();
    const parameters: Record<string, string> = {
      redirect_uri: this.buildCallbackUrl(provider.id),
      scope: OIDC_SCOPE,
      state,
    };

    let codeVerifier: string | undefined;
    const supportsPkce = config
      .serverMetadata()
      .code_challenge_methods_supported?.includes('S256');

    if (supportsPkce) {
      codeVerifier = oidc.randomPKCECodeVerifier();
      parameters.code_challenge =
        await oidc.calculatePKCECodeChallenge(codeVerifier);
      parameters.code_challenge_method = 'S256';
    }

    const authorizationUrl = oidc.buildAuthorizationUrl(config, parameters);

    const flowToken = jwt.sign(
      { providerId: provider.id, state, codeVerifier, redirect },
      this.environmentService.getAppSecret(),
      { expiresIn: FLOW_TOKEN_TTL },
    );

    return { authorizationUrl: authorizationUrl.href, flowToken };
  }

  verifyFlowToken(flowToken: string, providerId: string): OidcFlowState {
    let payload: OidcFlowState;
    try {
      payload = jwt.verify(
        flowToken,
        this.environmentService.getAppSecret(),
      ) as OidcFlowState;
    } catch {
      throw new UnauthorizedException(
        'The login session expired. Please try again.',
      );
    }

    if (payload.providerId !== providerId) {
      throw new UnauthorizedException('Invalid login session.');
    }

    return payload;
  }

  /**
   * Complete the authorization code exchange and return the resolved identity
   * (subject, email, name) from the ID token / userinfo endpoint.
   */
  async handleCallback(
    provider: AuthProvider,
    currentUrl: string,
    flow: OidcFlowState,
  ): Promise<{ providerUserId: string; email: string; name?: string }> {
    const oidc = await loadOpenIdClient();
    const config = await this.discover(provider);

    let tokens: OpenIdClient.TokenEndpointResponse &
      OpenIdClient.TokenEndpointResponseHelpers;
    try {
      tokens = await oidc.authorizationCodeGrant(config, new URL(currentUrl), {
        expectedState: flow.state,
        pkceCodeVerifier: flow.codeVerifier,
      });
    } catch (err: any) {
      this.logger.error(`OIDC token exchange failed: ${err?.message}`);
      throw new UnauthorizedException(
        'Failed to complete sign-in with the OIDC provider.',
      );
    }

    const claims = tokens.claims() ?? ({} as OpenIdClient.IDToken);
    const sub = claims.sub as string;

    let profile: Record<string, any> = { ...claims };
    if (sub) {
      try {
        const userinfo = await oidc.fetchUserInfo(
          config,
          tokens.access_token,
          sub,
        );
        profile = { ...profile, ...userinfo };
      } catch (err: any) {
        this.logger.debug(`OIDC userinfo fetch skipped: ${err?.message}`);
      }
    }

    const email = (profile.email as string)?.toLowerCase();
    const name =
      (profile.name as string) ||
      [profile.given_name, profile.family_name].filter(Boolean).join(' ') ||
      (profile.preferred_username as string) ||
      undefined;

    if (!sub) {
      throw new UnauthorizedException(
        'The OIDC provider did not return a subject identifier.',
      );
    }

    return { providerUserId: sub, email, name };
  }
}
