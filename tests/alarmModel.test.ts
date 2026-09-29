import { AlarmValidationError, parseAlarm } from '../src/features/alarms';

const validAlarm = {
  id: 'morning-alarm',
  label: 'Morning alarm',
  time: { hour: 7, minute: 30 },
  repeatWeekdays: [5, 1, 3],
  enabled: false,
  scheduling: { status: 'unscheduled', nativeId: null, error: null },
  createdAt: '2026-09-29T12:00:00.000Z',
  updatedAt: '2026-09-29T12:00:00.000Z',
};

describe('alarm model', () => {
  it('validates and normalizes a stored alarm', () => {
    expect(parseAlarm(validAlarm)).toEqual({
      ...validAlarm,
      repeatWeekdays: [1, 3, 5],
    });
  });

  it.each([
    [{ ...validAlarm, time: { hour: 24, minute: 0 } }, 'time.hour'],
    [{ ...validAlarm, time: { hour: 7, minute: -1 } }, 'time.minute'],
    [{ ...validAlarm, repeatWeekdays: [1, 1] }, 'repeatWeekdays'],
    [{ ...validAlarm, updatedAt: 'not-a-date' }, 'updatedAt'],
  ])('rejects invalid alarm data %#', (alarm, path) => {
    expect(() => parseAlarm(alarm)).toThrow(
      expect.objectContaining<Partial<AlarmValidationError>>({ path }),
    );
  });

  it('requires enabled alarms to have successful native scheduling', () => {
    expect(() => parseAlarm({ ...validAlarm, enabled: true })).toThrow(
      /enabled: must be true exactly when native scheduling succeeded/,
    );
  });

  it('accepts a scheduled alarm only with a native identifier', () => {
    expect(
      parseAlarm({
        ...validAlarm,
        enabled: true,
        scheduling: {
          status: 'scheduled',
          nativeId: 'native-123',
          error: null,
        },
      }).scheduling,
    ).toEqual({
      status: 'scheduled',
      nativeId: 'native-123',
      error: null,
    });
  });

  it('keeps a scheduling failure disabled and preserves its reason', () => {
    expect(
      parseAlarm({
        ...validAlarm,
        scheduling: {
          status: 'failed',
          nativeId: null,
          error: 'Permission denied',
        },
      }).scheduling,
    ).toEqual({
      status: 'failed',
      nativeId: null,
      error: 'Permission denied',
    });
  });
});
