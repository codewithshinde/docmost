import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ReactionService } from './reaction.service';
import { AddReactionDto, RemoveReactionDto } from './dto/reaction.dto';
import { AuthUser } from '../../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../../common/decorators/auth-workspace.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { User, Workspace } from '@docmost/db/types/entity.types';

@UseGuards(JwtAuthGuard)
@Controller('reactions')
export class ReactionController {
  constructor(private readonly reactionService: ReactionService) {}

  @HttpCode(HttpStatus.OK)
  @Post('add')
  async addReaction(
    @Body() dto: AddReactionDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.reactionService.addReaction(dto, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('remove')
  async removeReaction(
    @Body() dto: RemoveReactionDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.reactionService.removeReaction(dto, user, workspace);
  }
}
