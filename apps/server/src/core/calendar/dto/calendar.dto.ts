import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class EventIdDto {
  @IsUUID()
  eventId: string;
}

export class ListCalendarEventsDto {
  @IsDateString()
  start: string;

  @IsDateString()
  end: string;
}

export class CreateCalendarEventDto {
  @IsString()
  @MaxLength(280)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @IsDateString()
  startsAt: string;

  @IsDateString()
  endsAt: string;

  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @IsOptional()
  @IsIn(['default', 'private'])
  visibility?: string;

  @IsOptional()
  @IsBoolean()
  addVideoCall?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  attendeeUserIds?: string[];
}

export class UpdateCalendarEventDto extends EventIdDto {
  @IsOptional()
  @IsString()
  @MaxLength(280)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @IsOptional()
  @IsIn(['default', 'private'])
  visibility?: string;

  @IsOptional()
  @IsBoolean()
  addVideoCall?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  attendeeUserIds?: string[];
}

export class RespondCalendarEventDto extends EventIdDto {
  @IsIn(['accepted', 'declined', 'tentative'])
  responseStatus: string;
}
