import {
  nextRecurringOccurrence,
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

describe('next recurring occurrence', () => {
  it('keeps the selected wall-clock time after a daylight-saving change', () => {
    expect(
      nextRecurringOccurrence(
        { hour: 7, minute: 30 },
        [1, 2, 3, 4, 5],
        new Date('2026-03-06T16:00:00.000Z'),
        'America/Los_Angeles',
      ),
    ).toEqual({
      instant: new Date('2026-03-09T14:30:00.000Z'),
      localDate: { year: 2026, month: 3, day: 9 },
      resolution: 'exact',
    });
  });

  it('applies the gap policy to a selected spring-forward weekday', () => {
    expect(
      nextRecurringOccurrence(
        { hour: 2, minute: 30 },
        [7],
        new Date('2026-03-08T08:00:00.000Z'),
        'America/Los_Angeles',
      ),
    ).toEqual({
      instant: new Date('2026-03-08T10:00:00.000Z'),
      localDate: { year: 2026, month: 3, day: 8 },
      resolution: 'gap-adjusted',
    });
  });

  it('does not fire twice during the repeated fall-back hour', () => {
    expect(
      nextRecurringOccurrence(
        { hour: 1, minute: 30 },
        [7],
        new Date('2026-11-01T08:45:00.000Z'),
        'America/Los_Angeles',
      ).instant,
    ).toEqual(new Date('2026-11-08T09:30:00.000Z'));
  });

  it('follows the same local time in the current zone after travel', () => {
    const after = new Date('2026-06-15T10:00:00.000Z');
    expect(
      nextRecurringOccurrence(
        { hour: 7, minute: 30 },
        [1],
        after,
        'America/Los_Angeles',
      ).instant,
    ).toEqual(new Date('2026-06-15T14:30:00.000Z'));
    expect(
      nextRecurringOccurrence(
        { hour: 7, minute: 30 },
        [1],
        after,
        'America/New_York',
      ).instant,
    ).toEqual(new Date('2026-06-15T11:30:00.000Z'));
  });

  it('rejects an empty repeat selection and invalid comparison instant', () => {
    expect(() =>
      nextRecurringOccurrence({ hour: 7, minute: 30 }, [], new Date(), 'UTC'),
    ).toThrow(/at least one weekday/);
    expect(() =>
      nextRecurringOccurrence(
        { hour: 7, minute: 30 },
        [1],
        new Date('invalid'),
        'UTC',
      ),
    ).toThrow(/valid date/);
  });
});
