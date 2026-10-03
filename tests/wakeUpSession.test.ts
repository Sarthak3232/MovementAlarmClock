import {
  applyWakeUpSessionEvent,
  createWakeUpSession,
  type WakeUpSession,
} from '../src/features/challenge';

const startedAt = '2026-10-03T14:00:00.000Z';

function ringingSession(): WakeUpSession {
  return createWakeUpSession({
    id: 'session-1',
    alarmId: 'alarm-1',
    occurrenceId: 'occurrence-1',
    startedAt,
    systemAlarmStatus: 'ringing',
  });
}

describe('wake-up session lifecycle', () => {
  it('creates an active five-rep session without inventing alarm state', () => {
    expect(
      createWakeUpSession({
        id: ' session-1 ',
        alarmId: 'alarm-1',
        occurrenceId: 'occurrence-1',
        startedAt,
      }),
    ).toEqual({
      id: 'session-1',
      alarmId: 'alarm-1',
      occurrenceId: 'occurrence-1',
      startedAt,
      updatedAt: startedAt,
      targetReps: 5,
      repCount: 0,
      challenge: { status: 'active', endedAt: null, fallbackReason: null },
      systemAlarm: { status: 'unknown', stoppedAt: null, stopSource: null },
    });
  });

  it('tracks monotonic rep progress and ignores stale or duplicate updates', () => {
    const first = applyWakeUpSessionEvent(ringingSession(), {
      type: 'rep-progressed',
      repCount: 2,
      at: '2026-10-03T14:01:00.000Z',
    });
    expect(first.disposition).toBe('applied');
    expect(first.session.repCount).toBe(2);

    const duplicate = applyWakeUpSessionEvent(first.session, {
      type: 'rep-progressed',
      repCount: 2,
      at: '2026-10-03T14:01:01.000Z',
    });
    expect(duplicate).toEqual({
      session: first.session,
      disposition: 'duplicate',
      effects: [],
    });

    const stale = applyWakeUpSessionEvent(first.session, {
      type: 'rep-progressed',
      repCount: 1,
      at: '2026-10-03T14:00:30.000Z',
    });
    expect(stale.disposition).toBe('ignored');
    expect(stale.session.repCount).toBe(2);
  });

  it('completes movement once and requests a stop without claiming it happened', () => {
    const completed = applyWakeUpSessionEvent(ringingSession(), {
      type: 'movement-completed',
      at: '2026-10-03T14:02:00.000Z',
    });
    expect(completed).toMatchObject({
      disposition: 'applied',
      effects: ['request-system-alarm-stop'],
      session: {
        repCount: 5,
        challenge: {
          status: 'completed',
          endedAt: '2026-10-03T14:02:00.000Z',
        },
        systemAlarm: { status: 'ringing' },
      },
    });

    const duplicate = applyWakeUpSessionEvent(completed.session, {
      type: 'movement-completed',
      at: '2026-10-03T14:02:01.000Z',
    });
    expect(duplicate.disposition).toBe('duplicate');
    expect(duplicate.effects).toEqual([]);
  });

  it('records a system stop without completing the movement challenge', () => {
    const stopped = applyWakeUpSessionEvent(ringingSession(), {
      type: 'system-alarm-stopped',
      source: 'system-control',
      at: '2026-10-03T14:00:30.000Z',
    });
    expect(stopped.session.systemAlarm).toEqual({
      status: 'stopped',
      stoppedAt: '2026-10-03T14:00:30.000Z',
      stopSource: 'system-control',
    });
    expect(stopped.session.challenge.status).toBe('active');
    expect(stopped.session.repCount).toBe(0);

    const completedLater = applyWakeUpSessionEvent(stopped.session, {
      type: 'movement-completed',
      at: '2026-10-03T14:02:00.000Z',
    });
    expect(completedLater.session.challenge.status).toBe('completed');
    expect(completedLater.effects).toEqual([]);
  });

  it('keeps fallback and abandonment distinct from completion', () => {
    const fallback = applyWakeUpSessionEvent(ringingSession(), {
      type: 'fallback-used',
      reason: 'camera-denied',
      at: '2026-10-03T14:01:00.000Z',
    });
    expect(fallback.session.challenge).toEqual({
      status: 'fallback',
      endedAt: '2026-10-03T14:01:00.000Z',
      fallbackReason: 'camera-denied',
    });
    expect(fallback.session.repCount).toBe(0);

    const conflictingCompletion = applyWakeUpSessionEvent(fallback.session, {
      type: 'movement-completed',
      at: '2026-10-03T14:02:00.000Z',
    });
    expect(conflictingCompletion.disposition).toBe('ignored');
    expect(conflictingCompletion.session.challenge.status).toBe('fallback');

    const abandoned = applyWakeUpSessionEvent(ringingSession(), {
      type: 'abandoned',
      at: '2026-10-03T14:01:30.000Z',
    });
    expect(abandoned.session.challenge.status).toBe('abandoned');
  });

  it('rejects invalid identifiers, timestamps, targets, and terminal progress', () => {
    expect(() =>
      createWakeUpSession({
        id: '',
        alarmId: 'alarm-1',
        occurrenceId: 'occurrence-1',
        startedAt,
      }),
    ).toThrow(/id/);
    expect(() =>
      createWakeUpSession({
        id: 'session-1',
        alarmId: 'alarm-1',
        occurrenceId: 'occurrence-1',
        startedAt: 'not-a-date',
      }),
    ).toThrow(/canonical ISO/);
    expect(() =>
      createWakeUpSession({
        id: 'session-1',
        alarmId: 'alarm-1',
        occurrenceId: 'occurrence-1',
        startedAt,
        targetReps: 0,
      }),
    ).toThrow(/positive integer/);
    expect(() =>
      applyWakeUpSessionEvent(ringingSession(), {
        type: 'rep-progressed',
        repCount: 5,
        at: '2026-10-03T14:01:00.000Z',
      }),
    ).toThrow(/movement-completed/);
    expect(() =>
      applyWakeUpSessionEvent(ringingSession(), {
        type: 'abandoned',
        at: '2026-10-03T13:59:59.000Z',
      }),
    ).toThrow(/cannot precede/);
  });
});
