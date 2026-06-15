import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { User } from '@docmost/db/types/entity.types';
import { MailAccountService } from './mail-account.service';
import {
  GetMailMessageDto,
  ListMailMessagesDto,
  SaveMailAccountDto,
} from './dto/mail-account.dto';

@UseGuards(JwtAuthGuard)
@Controller('mail-accounts')
export class MailAccountController {
  constructor(private readonly mailAccountService: MailAccountService) {}

  @HttpCode(HttpStatus.OK)
  @Post('me')
  getMyAccount(@AuthUser() user: User) {
    return this.mailAccountService.getView(user.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('me/save')
  saveMyAccount(@Body() dto: SaveMailAccountDto, @AuthUser() user: User) {
    return this.mailAccountService.save(user.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('me/delete')
  deleteMyAccount(@AuthUser() user: User) {
    return this.mailAccountService.delete(user.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('me/test')
  testMyAccount(@AuthUser() user: User) {
    return this.mailAccountService.testConnection(user.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('me/messages')
  listMyMessages(@Body() dto: ListMailMessagesDto, @AuthUser() user: User) {
    return this.mailAccountService.listMessages(user.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('me/messages/get')
  getMyMessage(@Body() dto: GetMailMessageDto, @AuthUser() user: User) {
    return this.mailAccountService.getMessage(user.id, dto);
  }
}
