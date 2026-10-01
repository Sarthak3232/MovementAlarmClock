import {
  recurringSchedulePolicy,
  resolveLocalDateTime,
} from '../src/features/alarms';

describe('local scheduling policy', () => {
  it('keeps ordinary local wall-clock times exact', () => {
    expect(
      resolveLocalDateTime(
        { year: 2026, month: 6, day: 15 },
        { hour: 7, minute: 30 },
        'America/Los_Angeles',
      ),
    ).toEqual({
      instant: new Date('2026-06-15T14:30:00.000Z'),
      resolution: 'exact',
    });
  });

  it('moves a nonexistent spring-forward time to the first valid minute', () => {
    expect(
      resolveLocalDateTime(
        { year: 2026, month: 3, day: 8 },
        { hour: 2, minute: 30 },
        'America/Los_Angeles',
      ),
    ).toEqual({
      instant: new Date('2026-03-08T10:00:00.000Z'),
      resolution: 'gap-adjusted',
    });
  });

  it('uses only the first occurrence of a repeated fall-back time', () => {
    expect(
      resolveLocalDateTime(
        { year: 2026, month: 11, day: 1 },
        { hour: 1, minute: 30 },
        'America/Los_Angeles',
      ),
    ).toEqual({
      instant: new Date('2026-11-01T08:30:00.000Z'),
      resolution: 'exact',
    });
  });

  it('rejects invalid dates, times, and time zones', () => {
    expect(() =>
      resolveLocalDateTime(
        { year: 2026, month: 2, day: 30 },
        { hour: 7, minute: 30 },
        'America/Los_Angeles',
      ),
    ).toThrow(/valid Gregorian/);
    expect(() =>
      resolveLocalDateTime(
        { year: 2026, month: 2, day: 28 },
        { hour: 24, minute: 0 },
        'America/Los_Angeles',
      ),
    ).toThrow(/hour/);
    expect(() =>
      resolveLocalDateTime(
        { year: 2026, month: 2, day: 28 },
        { hour: 7, minute: 30 },
        'Mars/Olympus_Mons',
      ),
    ).toThrow(/Unsupported time zone/);
  });

  it('publishes the policy that native scheduling must preserve', () => {
    expect(recurringSchedulePolicy).toEqual({
      timeZone: 'device-local',
      nonexistentLocalTime: 'first-valid-time-after-gap',
      repeatedLocalTime: 'first-occurrence-only',
    });
  });
});
