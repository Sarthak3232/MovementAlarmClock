import { parseAlarm, type Alarm, type Weekday } from './model';

export type AlarmFormValues = {
  label: string;
  hour: string;
  minute: string;
  repeatWeekdays: Weekday[];
};

export class AlarmFormValidationError extends Error {
  constructor(
    readonly field: 'label' | 'hour' | 'minute',
    message: string,
  ) {
    super(message);
    this.name = 'AlarmFormValidationError';
  }
}

function parseInteger(
  value: string,
  field: 'hour' | 'minute',
  maximum: number,
): number {
  if (!/^\d+$/.test(value.trim())) {
    throw new AlarmFormValidationError(field, 'Enter a whole number.');
  }
  const parsed = Number(value);
  if (parsed < 0 || parsed > maximum) {
    throw new AlarmFormValidationError(
      field,
      `Enter a value from 0 through ${maximum}.`,
    );
  }
  return parsed;
}

function parseValues(values: AlarmFormValues) {
  const label = values.label.trim();
  if (label.length === 0) {
    throw new AlarmFormValidationError('label', 'Enter an alarm name.');
  }
  if (label.length > 80) {
    throw new AlarmFormValidationError('label', 'Use 80 characters or fewer.');
  }

  return {
    label,
    time: {
      hour: parseInteger(values.hour, 'hour', 23),
      minute: parseInteger(values.minute, 'minute', 59),
    },
    repeatWeekdays: [...new Set(values.repeatWeekdays)].sort(
      (left, right) => left - right,
    ),
  };
}

export function createSavedAlarm(
  values: AlarmFormValues,
  id: string,
  now: string,
): Alarm {
  return parseAlarm({
    id,
    ...parseValues(values),
    enabled: false,
    scheduling: { status: 'unscheduled', nativeId: null, error: null },
    createdAt: now,
    updatedAt: now,
  });
}

export function updateSavedAlarm(
  alarm: Alarm,
  values: AlarmFormValues,
  now: string,
): Alarm {
  return parseAlarm({
    ...alarm,
    ...parseValues(values),
    enabled: false,
    scheduling: { status: 'unscheduled', nativeId: null, error: null },
    updatedAt: now,
  });
}

export function alarmToFormValues(alarm: Alarm): AlarmFormValues {
  return {
    label: alarm.label,
    hour: String(alarm.time.hour),
    minute: String(alarm.time.minute).padStart(2, '0'),
    repeatWeekdays: alarm.repeatWeekdays,
  };
}

export function formatAlarmTime(alarm: Alarm): string {
  const date = new Date(2000, 0, 1, alarm.time.hour, alarm.time.minute);
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

const weekdayNames: Record<Weekday, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
};

export function formatRepeatWeekdays(days: Weekday[]): string {
  if (days.length === 0) {
    return 'Once';
  }
  if (days.length === 7) {
    return 'Every day';
  }
  return days.map((day) => weekdayNames[day]).join(', ');
}
