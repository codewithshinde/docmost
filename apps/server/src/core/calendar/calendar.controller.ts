import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CalendarService } from './calendar.service';
import {
  CreateCalendarEventDto,
  EventIdDto,
  ListCalendarEventsDto,
  RespondCalendarEventDto,
  UpdateCalendarEventDto,
} from './dto/calendar.dto';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User, Workspace } from '@docmost/db/types/entity.types';

@UseGuards(JwtAuthGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @HttpCode(HttpStatus.OK)
  @Post('events')
  async listEvents(
    @Body() dto: ListCalendarEventsDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.calendarService.listEvents(dto, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('events/get')
  async getEventById(
    @Body() dto: EventIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.calendarService.getEventById(dto, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('events/create')
  async createEvent(
    @Body() dto: CreateCalendarEventDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.calendarService.createEvent(dto, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('events/update')
  async updateEvent(
    @Body() dto: UpdateCalendarEventDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.calendarService.updateEvent(dto, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('events/delete')
  async deleteEvent(
    @Body() dto: EventIdDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.calendarService.deleteEvent(dto, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('events/respond')
  async respondToEvent(
    @Body() dto: RespondCalendarEventDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.calendarService.respondToEvent(dto, user, workspace);
  }
}
