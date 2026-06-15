import {
  IsArray,
  IsEmail,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class AvailabilityRuleDto {
  @IsInt()
  day: number; // 0 Sunday - 6 Saturday

  @IsString()
  start: string; // HH:mm

  @IsString()
  end: string; // HH:mm
}

export class SaveScheduleDto {
  @IsString()
  name: string;

  @IsString()
  timeZone: string;

  @IsArray()
  rules: AvailabilityRuleDto[];
}

export class CreateEventTypeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  scheduleId?: string;

  @IsInt()
  @Min(5)
  durationMinutes: number;

  @IsOptional()
  @IsInt()
  minimumNoticeMinutes?: number;
}

export class EventTypeIdDto {
  @IsUUID()
  eventTypeId: string;
}

export class GetSlotsDto extends EventTypeIdDto {
  @IsISO8601()
  start: string;

  @IsISO8601()
  end: string;
}

export class CreateBookingDto extends EventTypeIdDto {
  @IsISO8601()
  startsAt: string;

  @IsString()
  bookerName: string;

  @IsEmail()
  bookerEmail: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
