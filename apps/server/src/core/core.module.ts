import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { PageModule } from './page/page.module';
import { AttachmentModule } from './attachment/attachment.module';
import { CommentModule } from './comment/comment.module';
import { SearchModule } from './search/search.module';
import { SpaceModule } from './space/space.module';
import { GroupModule } from './group/group.module';
import { CaslModule } from './casl/casl.module';
import { PageAccessModule } from './page/page-access/page-access.module';
import { DomainMiddleware } from '../common/middlewares/domain.middleware';
import { AuditContextMiddleware } from '../common/middlewares/audit-context.middleware';
import { ShareModule } from './share/share.module';
import { LabelModule } from './label/label.module';
import { NotificationModule } from './notification/notification.module';
import { WatcherModule } from './watcher/watcher.module';
import { FavoriteModule } from './favorite/favorite.module';
import { SessionModule } from './session/session.module';
import { SsoModule } from './sso/sso.module';
import { TemplateModule } from './template/template.module';
import { ApiKeyModule } from './api-key/api-key.module';
import { AuditCoreModule } from './audit/audit.module';
import { ClsMiddleware } from 'nestjs-cls';
import { TeamModule } from './chat/team/team.module';
import { ChannelModule } from './chat/channel/channel.module';
import { MessageModule } from './chat/message/message.module';
import { ReactionModule } from './chat/reaction/reaction.module';
import { CallModule } from './chat/call/call.module';
import { SchedulingModule } from './scheduling/scheduling.module';
import { MailAccountModule } from './mail-account/mail-account.module';

@Module({
  imports: [
    UserModule,
    AuthModule,
    WorkspaceModule,
    PageModule,
    AttachmentModule,
    CommentModule,
    FavoriteModule,
    SearchModule,
    SpaceModule,
    GroupModule,
    CaslModule,
    PageAccessModule,
    ShareModule,
    LabelModule,
    NotificationModule,
    WatcherModule,
    SessionModule,
    SsoModule,
    TemplateModule,
    ApiKeyModule,
    AuditCoreModule,
    TeamModule,
    ChannelModule,
    MessageModule,
    ReactionModule,
    CallModule,
    SchedulingModule,
    MailAccountModule,
  ],
})
export class CoreModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    const excludedRoutes = [
      { path: 'auth/setup', method: RequestMethod.POST },
      { path: 'health', method: RequestMethod.GET },
      { path: 'health/live', method: RequestMethod.GET },
      { path: 'billing/stripe/webhook', method: RequestMethod.POST },
    ];

    consumer
      .apply(DomainMiddleware)
      .exclude(...excludedRoutes)
      .forRoutes('*');

    consumer
      .apply(AuditContextMiddleware)
      .exclude(...excludedRoutes)
      .forRoutes('*');
  }
}
