import { Module } from '@nestjs/common';
import { SsoController } from './sso.controller';
import { OidcController } from './oidc.controller';
import { SsoService } from './sso.service';
import { OidcService } from './oidc.service';
import { WorkspaceModule } from '../workspace/workspace.module';

@Module({
  imports: [WorkspaceModule],
  controllers: [SsoController, OidcController],
  providers: [SsoService, OidcService],
  exports: [SsoService],
})
export class SsoModule {}
