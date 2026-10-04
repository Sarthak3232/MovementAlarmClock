import {
  applyWakeUpSessionEvent,
  createWakeUpSession,
  parseWakeUpSession,
  WakeUpSessionValidationError,
} from '../src/features/challenge';

function activeSession() {
  return createWakeUpSession({
    id: 'session-1',
    alarmId: 'alarm-1',
    occurrenceId: 'occurrence-1',
    startedAt: '2026-10-04T14:00:00.000Z',
    systemAlarmStatus: 'ringing',
  });
}

describe('persisted wake-up session validation', () => {
  it('round-trips valid active and completed sessions', () => {
    const active = activeSession();
    expect(parseWakeUpSession(JSON.parse(JSON.stringify(active)))).toEqual(
      active,
    );

    const completed = applyWakeUpSessionEvent(active, {
      type: 'movement-completed',
      at: '2026-10-04T14:01:00.000Z',
    }).session;
    expect(parseWakeUpSession(completed)).toEqual(completed);
  });

  it('rejects malformed identifiers, timestamps, and rep ranges', () => {
    expect(() => parseWakeUpSession({ ...activeSession(), id: '  ' })).toThrow(
      WakeUpSessionValidationError,
    );
    expect(() =>
      parseWakeUpSession({
        ...activeSession(),
        updatedAt: '2026-10-04T13:59:59.000Z',
      }),
    ).toThrow(/updatedAt/);
    expect(() =>
      parseWakeUpSession({ ...activeSession(), repCount: 6 }),
    ).toThrow(/repCount/);
    expect(() =>
      createWakeUpSession({
        id: 'session-1',
        alarmId: 'alarm-1',
        occurrenceId: 'occurrence-1',
        startedAt: '2026-10-04T14:00:00.000Z',
        systemAlarmStatus: 'stopped',
      } as unknown as Parameters<typeof createWakeUpSession>[0]),
    ).toThrow(/systemAlarmStatus/);
  });

  it('requires challenge terminal metadata and rep invariants', () => {
    expect(() =>
      parseWakeUpSession({
        ...activeSession(),
        challenge: {
          status: 'completed',
          endedAt: '2026-10-04T14:00:00.000Z',
          fallbackReason: null,
        },
      }),
    ).toThrow(/targetReps/);
    expect(() =>
      parseWakeUpSession({
        ...activeSession(),
        challenge: {
          status: 'fallback',
          endedAt: '2026-10-04T14:00:00.000Z',
          fallbackReason: 'network-error',
        },
      }),
    ).toThrow(/fallbackReason/);
  });

  it('does not infer a system stop from movement completion', () => {
    const completed = applyWakeUpSessionEvent(activeSession(), {
      type: 'movement-completed',
      at: '2026-10-04T14:01:00.000Z',
    }).session;
    expect(parseWakeUpSession(completed).systemAlarm).toEqual({
      status: 'ringing',
      stoppedAt: null,
      stopSource: null,
    });
  });

  it('rejects impossible system stop metadata', () => {
    expect(() =>
      parseWakeUpSession({
        ...activeSession(),
        systemAlarm: {
          status: 'ringing',
          stoppedAt: '2026-10-04T14:01:00.000Z',
          stopSource: 'system-control',
        },
      }),
    ).toThrow(/stop metadata/);
  });
});
