import type { LocalTime, Weekday } from './model';

export type LocalDate = {
  year: number;
  month: number;
  day: number;
};

export type LocalDateTimeResolution = {
  instant: Date;
  resolution: 'exact' | 'gap-adjusted';
};

export type RecurringOccurrence = LocalDateTimeResolution & {
  localDate: LocalDate;
};

export const recurringSchedulePolicy = {
  timeZone: 'device-local',
  nonexistentLocalTime: 'first-valid-time-after-gap',
  repeatedLocalTime: 'first-occurrence-only',
} as const;

type LocalDateTime = LocalDate & LocalTime;

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone);
  if (cached) {
    return cached;
  }

  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', {
      timeZone,
      calendar: 'gregory',
      numberingSystem: 'latn',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
  } catch {
    throw new RangeError(`Unsupported time zone: ${timeZone}`);
  }
  formatterCache.set(timeZone, formatter);
  return formatter;
}

function localParts(instant: Date, timeZone: string): LocalDateTime {
  const values = Object.fromEntries(
    formatterFor(timeZone)
      .formatToParts(instant)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
  };
}

function compareLocal(left: LocalDateTime, right: LocalDateTime): number {
  for (const key of ['year', 'month', 'day', 'hour', 'minute'] as const) {
    if (left[key] !== right[key]) {
      return left[key] - right[key];
    }
  }
  return 0;
}

function validateLocalDateTime(value: LocalDateTime): void {
  const date = new Date(Date.UTC(value.year, value.month - 1, value.day));
  if (
    !Number.isInteger(value.year) ||
    !Number.isInteger(value.month) ||
    !Number.isInteger(value.day) ||
    date.getUTCFullYear() !== value.year ||
    date.getUTCMonth() + 1 !== value.month ||
    date.getUTCDate() !== value.day
  ) {
    throw new RangeError('Local date must be a valid Gregorian calendar date.');
  }
  if (!Number.isInteger(value.hour) || value.hour < 0 || value.hour > 23) {
    throw new RangeError('Local hour must be an integer from 0 through 23.');
  }
  if (
    !Number.isInteger(value.minute) ||
    value.minute < 0 ||
    value.minute > 59
  ) {
    throw new RangeError('Local minute must be an integer from 0 through 59.');
  }
}

/**
 * Resolves a wall-clock value in an IANA time zone without relying on the
 * process time zone. Ambiguous values use their first occurrence. Values in a
 * forward clock-change gap move to the first representable minute afterward.
 */
export function resolveLocalDateTime(
  date: LocalDate,
  time: LocalTime,
  timeZone: string,
): LocalDateTimeResolution {
  const requested = { ...date, ...time };
  validateLocalDateTime(requested);
  formatterFor(timeZone);

  const approximate = Date.UTC(
    requested.year,
    requested.month - 1,
    requested.day,
    requested.hour,
    requested.minute,
  );
  const minute = 60_000;
  const searchRadius = 48 * 60 * minute;

  for (
    let timestamp = approximate - searchRadius;
    timestamp <= approximate + searchRadius;
    timestamp += minute
  ) {
    const instant = new Date(timestamp);
    const comparison = compareLocal(localParts(instant, timeZone), requested);
    if (comparison === 0) {
      return { instant, resolution: 'exact' };
    }
    if (comparison > 0) {
      return { instant, resolution: 'gap-adjusted' };
    }
  }

  throw new RangeError(
    'Could not resolve the local time within the search window.',
  );
}

function addCalendarDays(date: LocalDate, days: number): LocalDate {
  const result = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: result.getUTCFullYear(),
    month: result.getUTCMonth() + 1,
    day: result.getUTCDate(),
  };
}

function weekdayFor(date: LocalDate): Weekday {
  const sundayBased = new Date(
    Date.UTC(date.year, date.month - 1, date.day),
  ).getUTCDay();
  return (sundayBased === 0 ? 7 : sundayBased) as Weekday;
}

/**
 * Finds the next selected weekday after an instant. The caller supplies the
 * current device time zone so a reconciliation after travel preserves the
 * alarm's wall-clock time in the new zone.
 */
export function nextRecurringOccurrence(
  time: LocalTime,
  repeatWeekdays: Weekday[],
  after: Date,
  timeZone: string,
): RecurringOccurrence {
  if (Number.isNaN(after.getTime())) {
    throw new RangeError('The comparison instant must be a valid date.');
  }
  if (
    repeatWeekdays.length === 0 ||
    repeatWeekdays.some((day) => !Number.isInteger(day) || day < 1 || day > 7)
  ) {
    throw new RangeError(
      'A recurring schedule needs at least one weekday from 1 through 7.',
    );
  }

  const localAfter = localParts(after, timeZone);
  const startingDate = {
    year: localAfter.year,
    month: localAfter.month,
    day: localAfter.day,
  };
  const selectedDays = new Set(repeatWeekdays);

  for (let offset = 0; offset <= 7; offset += 1) {
    const localDate = addCalendarDays(startingDate, offset);
    if (!selectedDays.has(weekdayFor(localDate))) {
      continue;
    }
    const candidate = resolveLocalDateTime(localDate, time, timeZone);
    if (candidate.instant.getTime() > after.getTime()) {
      return { ...candidate, localDate };
    }
  }

  throw new RangeError('Could not find the next recurring occurrence.');
}
