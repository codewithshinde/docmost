import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { SchedulingService } from './scheduling.service';
import {
  CreateBookingDto,
  CreateEventTypeDto,
  GetSlotsDto,
  ListBookingsDto,
  SaveScheduleDto,
  UserEventTypesDto,
} from './dto/scheduling.dto';

@UseGuards(JwtAuthGuard)
@Controller('scheduling')
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @HttpCode(HttpStatus.OK)
  @Post('schedules')
  listSchedules(@AuthUser() user: User, @AuthWorkspace() workspace: Workspace) {
    return this.schedulingService.listSchedules(user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('schedules/save')
  saveSchedule(
    @Body() dto: SaveScheduleDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.schedulingService.saveSchedule(dto, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('event-types')
  listEventTypes(@AuthUser() user: User, @AuthWorkspace() workspace: Workspace) {
    return this.schedulingService.listEventTypes(user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('event-types/create')
  createEventType(
    @Body() dto: CreateEventTypeDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.schedulingService.createEventType(dto, user, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('slots')
  getSlots(@Body() dto: GetSlotsDto, @AuthWorkspace() workspace: Workspace) {
    return this.schedulingService.getSlots(dto, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('bookings/create')
  createBooking(
    @Body() dto: CreateBookingDto,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.schedulingService.createBooking(dto, workspace);
  }

  @HttpCode(HttpStatus.OK)
  @Post('bookings')
  listMyBookings(
    @Body() dto: ListBookingsDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.schedulingService.listMyBookings(
      user,
      workspace,
      new Date(dto.start),
      new Date(dto.end),
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('event-types/user')
  listEventTypesForUser(
    @Body() dto: UserEventTypesDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.schedulingService.listEventTypesForUser(
      dto.userId,
      user.id,
      workspace,
    );
  }
}
