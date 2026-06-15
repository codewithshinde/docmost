import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CallService } from './call.service';
import {
  CallIdDto,
  CallScreenShareDto,
  ChannelCallDto,
} from './dto/call.dto';
import { AuthUser } from '../../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../../common/decorators/auth-workspace.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { User, Workspace } from '@docmost/db/types/entity.types';

@UseGuards(JwtAuthGuard)
@Controller('calls')
export class CallController {
  constructor(private readonly callService: CallService) {}

  @HttpCode(HttpStatus.OK)
  @Post('config')
  getConfig() {
    return this.callService.getConfig();
  }

  @HttpCode(HttpStatus.OK)
  @Post('active')
  async getActiveCall(
    @Body() dto: ChannelCallDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.callService.getActiveCall(dto.channelId, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('join')
  async joinCall(
    @Body() dto: ChannelCallDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.callService.joinCall(dto.channelId, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('leave')
  async leaveCall(
    @Body() dto: CallIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.callService.leaveCall(dto.callId, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('screen-share')
  async setScreenSharing(
    @Body() dto: CallScreenShareDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.callService.setScreenSharing(dto, user, workspace);
  }
}
