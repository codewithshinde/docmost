import {
  Controller,
  Get,
  Logger,
  Param,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Public } from '../../common/decorators/public.decorator';
import { SkipTransform } from '../../common/decorators/skip-transform.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { Workspace } from '@docmost/db/types/entity.types';
import { EnvironmentService } from '../../integrations/environment/environment.service';
import { SessionService } from '../session/session.service';
import { AuthProviderRepo } from '@docmost/db/repos/auth-provider/auth-provider.repo';
import { OidcService } from './oidc.service';
import { SsoService } from './sso.service';
import { SsoProviderType } from './dto/sso.dto';

const OIDC_FLOW_COOKIE = 'oidc_flow';
const OIDC_FLOW_COOKIE_PATH = '/api/sso/oidc';

@Controller('sso/oidc')
export class OidcController {
  private readonly logger = new Logger(OidcController.name);

  constructor(
    private readonly oidcService: OidcService,
    private readonly ssoService: SsoService,
    private readonly authProviderRepo: AuthProviderRepo,
    private readonly sessionService: SessionService,
    private readonly environmentService: EnvironmentService,
  ) {}

  @Public()
  @SkipTransform()
  @Get(':providerId/login')
  async login(
    @Param('providerId') providerId: string,
    @Query('redirect') redirect: string,
    @AuthWorkspace() workspace: Workspace,
    @Res() res: FastifyReply,
  ) {
    const provider = await this.authProviderRepo.findEnabledById(
      providerId,
      workspace.id,
    );

    if (!provider || provider.type !== SsoProviderType.OIDC) {
      return this.redirectWithError(res, 'sso_provider_not_found');
    }

    try {
      const { authorizationUrl, flowToken } =
        await this.oidcService.createAuthorizationRequest(provider, redirect);

      res.setCookie(OIDC_FLOW_COOKIE, flowToken, {
        httpOnly: true,
        sameSite: 'lax',
        path: OIDC_FLOW_COOKIE_PATH,
        secure: this.environmentService.isHttps(),
        maxAge: 10 * 60,
      });

      return res.redirect(authorizationUrl);
    } catch (err: any) {
      this.logger.error(`OIDC login init failed: ${err?.message}`);
      return this.redirectWithError(res, 'sso_init_failed');
    }
  }

  @Public()
  @SkipTransform()
  @Get(':providerId/callback')
  async callback(
    @Param('providerId') providerId: string,
    @AuthWorkspace() workspace: Workspace,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    const flowToken = (req as any).cookies?.[OIDC_FLOW_COOKIE];
    res.clearCookie(OIDC_FLOW_COOKIE, { path: OIDC_FLOW_COOKIE_PATH });

    if (!flowToken) {
      return this.redirectWithError(res, 'sso_session_expired');
    }

    try {
      const flow = this.oidcService.verifyFlowToken(flowToken, providerId);

      const provider = await this.authProviderRepo.findEnabledById(
        providerId,
        workspace.id,
      );
      if (!provider || provider.type !== SsoProviderType.OIDC) {
        return this.redirectWithError(res, 'sso_provider_not_found');
      }

      const currentUrl = `${this.environmentService.getAppUrl()}${req.url}`;

      const identity = await this.oidcService.handleCallback(
        provider,
        currentUrl,
        flow,
      );

      const user = await this.ssoService.findOrProvisionUser({
        provider,
        providerUserId: identity.providerUserId,
        email: identity.email,
        name: identity.name,
        workspace,
      });

      const authToken = await this.sessionService.createSessionAndToken(user);

      res.setCookie('authToken', authToken, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        expires: this.environmentService.getCookieExpiresIn(),
        secure: this.environmentService.isHttps(),
      });

      const target = this.resolveRedirectTarget(flow.redirect);
      return res.redirect(target);
    } catch (err: any) {
      this.logger.error(`OIDC callback failed: ${err?.message}`);
      return this.redirectWithError(res, 'sso_login_failed');
    }
  }

  private resolveRedirectTarget(redirect?: string): string {
    const appUrl = this.environmentService.getAppUrl();
    // Only allow same-app relative paths to avoid open-redirects.
    if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
      return `${appUrl}${redirect}`;
    }
    return `${appUrl}/home`;
  }

  private redirectWithError(res: FastifyReply, code: string) {
    const appUrl = this.environmentService.getAppUrl();
    return res.redirect(`${appUrl}/login?error=${encodeURIComponent(code)}`);
  }
}
