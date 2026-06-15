export interface IAvailabilityRule {
  day: number;
  start: string;
  end: string;
}

export interface IAvailabilitySchedule {
  id: string;
  name: string;
  timeZone: string;
  rules: IAvailabilityRule[];
}

export interface IEventType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  durationMinutes: number;
  minimumNoticeMinutes: number;
  scheduleId: string | null;
  enabled: boolean;
}
