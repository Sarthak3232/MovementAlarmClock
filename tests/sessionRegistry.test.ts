import {
  applyEventToOccurrence,
  createWakeUpSession,
  openWakeUpOccurrence,
  type CreateWakeUpSessionInput,
  type WakeUpSession,
} from '../src/features/challenge';

const firstOccurrence: CreateWakeUpSessionInput = {
  id: 'session-1',
  alarmId: 'alarm-1',
  occurrenceId: 'occurrence-1',
  startedAt: '2026-10-03T14:00:00.000Z',
  systemAlarmStatus: 'ringing',
};

describe('wake-up occurrence registry', () => {
  it('returns one session when the same occurrence callback is replayed', () => {
    const opened = openWakeUpOccurrence([], firstOccurrence);
    expect(opened.created).toBe(true);
    expect(opened.sessions).toHaveLength(1);

    const replayed = openWakeUpOccurrence(opened.sessions, {
      ...firstOccurrence,
      id: 'a-new-generated-id-that-must-not-win',
      startedAt: '2026-10-03T14:00:01.000Z',
    });
    expect(replayed.created).toBe(false);
    expect(replayed.sessions).toBe(opened.sessions);
    expect(replayed.session).toBe(opened.session);
  });

  it('creates separate sessions for separate occurrences of one alarm', () => {
    const first = openWakeUpOccurrence([], firstOccurrence);
    const second = openWakeUpOccurrence(first.sessions, {
      ...firstOccurrence,
      id: 'session-2',
      occurrenceId: 'occurrence-2',
      startedAt: '2026-10-04T14:00:00.000Z',
    });
    expect(second.created).toBe(true);
    expect(second.sessions.map((session) => session.id)).toEqual([
      'session-1',
      'session-2',
    ]);
  });

  it('rejects occurrence collisions between alarms and session ID reuse', () => {
    const opened = openWakeUpOccurrence([], firstOccurrence);
    expect(() =>
      openWakeUpOccurrence(opened.sessions, {
        ...firstOccurrence,
        id: 'session-2',
        alarmId: 'alarm-2',
      }),
    ).toThrow(/different alarms/);
    expect(() =>
      openWakeUpOccurrence(opened.sessions, {
        ...firstOccurrence,
        occurrenceId: 'occurrence-2',
      }),
    ).toThrow(/session ID already exists/);
  });

  it('updates only the matching occurrence and preserves duplicate events', () => {
    const first = openWakeUpOccurrence([], firstOccurrence);
    const second = openWakeUpOccurrence(first.sessions, {
      ...firstOccurrence,
      id: 'session-2',
      occurrenceId: 'occurrence-2',
      startedAt: '2026-10-04T14:00:00.000Z',
    });
    const progress = applyEventToOccurrence(second.sessions, 'occurrence-1', {
      type: 'rep-progressed',
      repCount: 1,
      at: '2026-10-03T14:01:00.000Z',
    });
    expect(progress.session.repCount).toBe(1);
    expect(progress.sessions[1]).toBe(second.sessions[1]);

    const duplicate = applyEventToOccurrence(
      progress.sessions,
      'occurrence-1',
      {
        type: 'rep-progressed',
        repCount: 1,
        at: '2026-10-03T14:01:01.000Z',
      },
    );
    expect(duplicate.disposition).toBe('duplicate');
    expect(duplicate.sessions).toBe(progress.sessions);
  });

  it('rejects malformed collections and unknown occurrences', () => {
    const session = createWakeUpSession(firstOccurrence);
    const duplicateOccurrence: WakeUpSession = {
      ...session,
      id: 'session-2',
    };
    expect(() =>
      openWakeUpOccurrence([session, duplicateOccurrence], {
        ...firstOccurrence,
        id: 'session-3',
        occurrenceId: 'occurrence-3',
      }),
    ).toThrow(/Duplicate alarm occurrence ID/);
    expect(() =>
      applyEventToOccurrence([session], 'missing-occurrence', {
        type: 'abandoned',
        at: '2026-10-03T14:01:00.000Z',
      }),
    ).toThrow(/Unknown alarm occurrence ID/);
  });
});
