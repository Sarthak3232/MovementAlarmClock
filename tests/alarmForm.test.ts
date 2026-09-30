import {
  AlarmFormValidationError,
  alarmToFormValues,
  createSavedAlarm,
  formatRepeatWeekdays,
  updateSavedAlarm,
  type AlarmFormValues,
} from '../src/features/alarms';

const values: AlarmFormValues = {
  label: ' Morning alarm ',
  hour: '7',
  minute: '05',
  repeatWeekdays: [5, 1, 3],
};

describe('alarm form rules', () => {
  it('creates a disabled saved record without claiming native scheduling', () => {
    const alarm = createSavedAlarm(
      values,
      'alarm-1',
      '2026-09-30T12:00:00.000Z',
    );

    expect(alarm).toMatchObject({
      id: 'alarm-1',
      label: 'Morning alarm',
      time: { hour: 7, minute: 5 },
      repeatWeekdays: [1, 3, 5],
      enabled: false,
      scheduling: { status: 'unscheduled', nativeId: null, error: null },
    });
  });

  it.each([
    [{ ...values, label: '   ' }, 'label'],
    [{ ...values, hour: '24' }, 'hour'],
    [{ ...values, minute: '5.5' }, 'minute'],
    [{ ...values, minute: '60' }, 'minute'],
  ] as const)('rejects invalid form input %#', (input, field) => {
    expect(() =>
      createSavedAlarm(input, 'alarm-1', '2026-09-30T12:00:00.000Z'),
    ).toThrow(
      expect.objectContaining<Partial<AlarmFormValidationError>>({ field }),
    );
  });

  it('updates editable fields while preserving stable identity and creation time', () => {
    const created = createSavedAlarm(
      values,
      'alarm-1',
      '2026-09-30T12:00:00.000Z',
    );
    const updated = updateSavedAlarm(
      created,
      { ...values, label: 'Later alarm', hour: '9' },
      '2026-09-30T13:00:00.000Z',
    );

    expect(updated).toMatchObject({
      id: created.id,
      label: 'Later alarm',
      time: { hour: 9, minute: 5 },
      createdAt: created.createdAt,
      updatedAt: '2026-09-30T13:00:00.000Z',
    });
    expect(alarmToFormValues(updated)).toEqual({
      label: 'Later alarm',
      hour: '9',
      minute: '05',
      repeatWeekdays: [1, 3, 5],
    });
  });

  it('formats empty and complete repeat schedules clearly', () => {
    expect(formatRepeatWeekdays([])).toBe('Once');
    expect(formatRepeatWeekdays([1, 2, 3, 4, 5, 6, 7])).toBe('Every day');
  });
});
