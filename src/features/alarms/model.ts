export const weekdays = [1, 2, 3, 4, 5, 6, 7] as const;

export type Weekday = (typeof weekdays)[number];

export type LocalTime = {
  hour: number;
  minute: number;
};

export type AlarmSchedulingState =
  | { status: 'unscheduled'; nativeId: null; error: null }
  | { status: 'scheduled'; nativeId: string; error: null }
  | { status: 'failed'; nativeId: null; error: string };

export type Alarm = {
  id: string;
  label: string;
  time: LocalTime;
  repeatWeekdays: Weekday[];
  enabled: boolean;
  scheduling: AlarmSchedulingState;
  createdAt: string;
  updatedAt: string;
};

export class AlarmValidationError extends Error {
  constructor(
    readonly path: string,
    message: string,
  ) {
    super(`${path}: ${message}`);
    this.name = 'AlarmValidationError';
  }
}

function fail(path: string, message: string): never {
  throw new AlarmValidationError(path, message);
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(path, 'must be an object');
  }
  return value as Record<string, unknown>;
}

function nonEmptyString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(path, 'must be a non-empty string');
  }
  return value.trim();
}

function integerInRange(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
): number {
  if (
    !Number.isInteger(value) ||
    (value as number) < minimum ||
    (value as number) > maximum
  ) {
    fail(path, `must be an integer from ${minimum} through ${maximum}`);
  }
  return value as number;
}

function timestamp(value: unknown, path: string): string {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    fail(path, 'must be a valid ISO timestamp');
  }
  const normalized = new Date(value).toISOString();
  if (normalized !== value) {
    fail(path, 'must use canonical ISO 8601 UTC form');
  }
  return normalized;
}

function parseWeekdays(value: unknown): Weekday[] {
  if (!Array.isArray(value)) {
    fail('repeatWeekdays', 'must be an array');
  }
  const parsed = value.map((day, index) =>
    integerInRange(day, `repeatWeekdays[${index}]`, 1, 7),
  ) as Weekday[];
  if (new Set(parsed).size !== parsed.length) {
    fail('repeatWeekdays', 'must not contain duplicates');
  }
  return parsed.sort((left, right) => left - right);
}

function parseScheduling(value: unknown): AlarmSchedulingState {
  const input = record(value, 'scheduling');
  if (input.status === 'scheduled') {
    if (input.error !== null) {
      fail('scheduling.error', 'must be null when scheduled');
    }
    return {
      status: 'scheduled',
      nativeId: nonEmptyString(input.nativeId, 'scheduling.nativeId'),
      error: null,
    };
  }
  if (input.status === 'unscheduled') {
    if (input.nativeId !== null || input.error !== null) {
      fail(
        'scheduling',
        'an unscheduled alarm cannot have a native ID or error',
      );
    }
    return { status: 'unscheduled', nativeId: null, error: null };
  }
  if (input.status === 'failed') {
    if (input.nativeId !== null) {
      fail('scheduling.nativeId', 'must be null after scheduling fails');
    }
    return {
      status: 'failed',
      nativeId: null,
      error: nonEmptyString(input.error, 'scheduling.error'),
    };
  }
  return fail('scheduling.status', 'must be unscheduled, scheduled, or failed');
}

export function parseAlarm(value: unknown): Alarm {
  const input = record(value, 'alarm');
  const timeInput = record(input.time, 'time');
  const scheduling = parseScheduling(input.scheduling);
  if (typeof input.enabled !== 'boolean') {
    fail('enabled', 'must be a boolean');
  }
  if ((scheduling.status === 'scheduled') !== input.enabled) {
    fail('enabled', 'must be true exactly when native scheduling succeeded');
  }

  const createdAt = timestamp(input.createdAt, 'createdAt');
  const updatedAt = timestamp(input.updatedAt, 'updatedAt');
  if (updatedAt < createdAt) {
    fail('updatedAt', 'must not precede createdAt');
  }

  return {
    id: nonEmptyString(input.id, 'id'),
    label: nonEmptyString(input.label, 'label'),
    time: {
      hour: integerInRange(timeInput.hour, 'time.hour', 0, 23),
      minute: integerInRange(timeInput.minute, 'time.minute', 0, 59),
    },
    repeatWeekdays: parseWeekdays(input.repeatWeekdays),
    enabled: input.enabled,
    scheduling,
    createdAt,
    updatedAt,
  };
}
