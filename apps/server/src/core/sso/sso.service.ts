import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { executeTx } from '@docmost/db/utils';
import { AuthProviderRepo } from '@docmost/db/repos/auth-provider/auth-provider.repo';
import { UserRepo } from '@docmost/db/repos/user/user.repo';
import { GroupUserRepo } from '@docmost/db/repos/group/group-user.repo';
import { WorkspaceService } from '../workspace/services/workspace.service';
import {
  AuthProvider,
  User,
  Workspace,
} from '@docmost/db/types/entity.types';
import { isUserDisabled, nanoIdGen } from '../../common/helpers';
import { validateAllowedEmail } from '../auth/auth.util';
import {
  CreateSsoProviderDto,
  SsoProviderType,
  UpdateSsoProviderDto,
} from './dto/sso.dto';

@Injectable()
export class SsoService {
  constructor(
    private readonly authProviderRepo: AuthProviderRepo,
    private readonly userRepo: UserRepo,
    private readonly groupUserRepo: GroupUserRepo,
    private readonly workspaceService: WorkspaceService,
    @InjectKysely() private readonly db: KyselyDB,
  ) {}

  async getProviders(workspaceId: string) {
    const items = await this.authProviderRepo.findAllByWorkspace(workspaceId);
    return {
      items,
      meta: {
        limit: items.length,
        page: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }

  async getProvider(
    providerId: string,
    workspaceId: string,
  ): Promise<AuthProvider> {
    const provider = await this.authProviderRepo.findById(
      providerId,
      workspaceId,
    );
    if (!provider) {
      throw new NotFoundException('SSO provider not found');
    }
    return provider;
  }

  async createProvider(
    dto: CreateSsoProviderDto,
    user: User,
    workspaceId: string,
  ): Promise<AuthProvider> {
    return this.authProviderRepo.insert({
      name: dto.name,
      type: dto.type,
      allowSignup: false,
      isEnabled: false,
      creatorId: user.id,
      workspaceId,
    });
  }

  async updateProvider(
    dto: UpdateSsoProviderDto,
    workspaceId: string,
  ): Promise<AuthProvider> {
    const provider = await this.getProvider(dto.providerId, workspaceId);

    const updatable: Record<string, any> = {};
    if (dto.name !== undefined) updatable.name = dto.name;
    if (dto.oidcIssuer !== undefined) updatable.oidcIssuer = dto.oidcIssuer;
    if (dto.oidcClientId !== undefined)
      updatable.oidcClientId = dto.oidcClientId;
    if (dto.oidcClientSecret !== undefined)
      updatable.oidcClientSecret = dto.oidcClientSecret;
    if (dto.allowSignup !== undefined) updatable.allowSignup = dto.allowSignup;
    if (dto.groupSync !== undefined) updatable.groupSync = dto.groupSync;
    if (dto.isEnabled !== undefined) updatable.isEnabled = dto.isEnabled;

    // Guard: only allow enabling an OIDC provider once it is fully configured
    if (dto.isEnabled === true && provider.type === SsoProviderType.OIDC) {
      const issuer = updatable.oidcIssuer ?? provider.oidcIssuer;
      const clientId = updatable.oidcClientId ?? provider.oidcClientId;
      const clientSecret =
        updatable.oidcClientSecret ?? provider.oidcClientSecret;

      if (!issuer || !clientId || !clientSecret) {
        throw new BadRequestException(
          'OIDC issuer, client ID and client secret are required before enabling this provider.',
        );
      }
    }

    return this.authProviderRepo.update(updatable, dto.providerId, workspaceId);
  }

  async deleteProvider(providerId: string, workspaceId: string): Promise<void> {
    await this.getProvider(providerId, workspaceId);
    await this.authProviderRepo.delete(providerId, workspaceId);
  }

  /**
   * Find an existing user for the given SSO identity, or provision a new one
   * when the provider allows signup. Returns the resolved user.
   */
  async findOrProvisionUser(opts: {
    provider: AuthProvider;
    providerUserId: string;
    email: string;
    name?: string;
    workspace: Workspace;
  }): Promise<User> {
    const { provider, providerUserId, workspace } = opts;
    const email = opts.email?.toLowerCase();

    if (!email) {
      throw new BadRequestException(
        'The SSO provider did not return an email address.',
      );
    }

    // 1. Existing linked account
    const account = await this.authProviderRepo.findAccountByProviderUser(
      provider.id,
      providerUserId,
      workspace.id,
    );

    if (account) {
      const linkedUser = await this.userRepo.findById(
        account.userId,
        workspace.id,
      );
      if (!linkedUser || isUserDisabled(linkedUser)) {
        throw new BadRequestException('This account is not active.');
      }
      return linkedUser;
    }

    // 2. Existing user by email -> link the SSO identity to it
    const existingUser = await this.userRepo.findByEmail(email, workspace.id);
    if (existingUser) {
      if (isUserDisabled(existingUser)) {
        throw new BadRequestException('This account is not active.');
      }

      await this.authProviderRepo.insertAccount({
        userId: existingUser.id,
        providerUserId,
        authProviderId: provider.id,
        workspaceId: workspace.id,
      });

      return existingUser;
    }

    // 3. New user -> only if signup is allowed for this provider
    if (!provider.allowSignup) {
      throw new BadRequestException(
        'No account found for this email and signups are disabled for this provider.',
      );
    }

    validateAllowedEmail(email, workspace);

    const user = await executeTx(this.db, async (trx) => {
      const newUser = await this.userRepo.insertUser(
        {
          email,
          name: opts.name || email.split('@')[0],
          password: nanoIdGen(32),
          emailVerifiedAt: new Date(),
          hasGeneratedPassword: true,
          workspaceId: workspace.id,
        },
        trx,
      );

      await this.workspaceService.addUserToWorkspace(
        newUser.id,
        workspace.id,
        undefined,
        trx,
      );

      await this.groupUserRepo.addUserToDefaultGroup(
        newUser.id,
        workspace.id,
        trx,
      );

      await this.authProviderRepo.insertAccount(
        {
          userId: newUser.id,
          providerUserId,
          authProviderId: provider.id,
          workspaceId: workspace.id,
        },
        trx,
      );

      return newUser;
    });

    return user;
  }
}
