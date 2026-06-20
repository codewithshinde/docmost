import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { WebPushService } from '../../integrations/webpush/webpush.service';
import { PushSubscriptionRepo } from '@docmost/db/repos/notification/push-subscription.repo';
import { SubscribePushDto, UnsubscribePushDto } from './dto/push-subscription.dto';

@UseGuards(JwtAuthGuard)
@Controller('push')
export class PushController {
  constructor(
    private readonly webPushService: WebPushService,
    private readonly pushSubscriptionRepo: PushSubscriptionRepo,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('vapid-public-key')
  async getVapidPublicKey() {
    return {
      enabled: this.webPushService.isEnabled(),
      publicKey: this.webPushService.getPublicKey() ?? null,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post('subscribe')
  async subscribe(
    @Body() dto: SubscribePushDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    await this.pushSubscriptionRepo.upsertSubscription({
      userId: user.id,
      workspaceId: workspace.id,
      endpoint: dto.endpoint,
      p256dh: dto.keys.p256dh,
      auth: dto.keys.auth,
      userAgent: dto.userAgent ?? null,
    });
  }

  @HttpCode(HttpStatus.OK)
  @Post('unsubscribe')
  async unsubscribe(@Body() dto: UnsubscribePushDto, @AuthUser() user: User) {
    await this.pushSubscriptionRepo.deleteSubscription(dto.endpoint, user.id);
  }
}
