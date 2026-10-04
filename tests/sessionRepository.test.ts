import type {
  CreateWakeUpSessionInput,
  WakeUpSession,
  WakeUpSessionEvent,
} from '../src/features/challenge';
import {
  SessionStorageError,
  WakeUpSessionRepository,
  sessionStorageSchemaVersion,
  type SessionStore,
} from '../src/storage';

class MemorySessionStore implements SessionStore {
  writes = 0;

  constructor(public value: string | null = null) {}

  async read() {
    return this.value;
  }

  async write(value: string) {
    this.writes += 1;
    this.value = value;
  }

  async clear() {
    this.value = null;
  }
}

function occurrence(
  id = 'session-1',
  occurrenceId = 'occurrence-1',
): CreateWakeUpSessionInput {
  return {
    id,
    alarmId: 'alarm-1',
    occurrenceId,
    startedAt: '2026-10-04T14:00:00.000Z',
    systemAlarmStatus: 'ringing',
  };
}

describe('wake-up session repository', () => {
  it('reloads a session and deduplicates a replayed occurrence', async () => {
    const store = new MemorySessionStore();
    const first = await new WakeUpSessionRepository(store).openOccurrence(
      occurrence(),
    );
    expect(first.created).toBe(true);

    const reloaded = new WakeUpSessionRepository(store);
    const replayed = await reloaded.openOccurrence({
      ...occurrence('discarded-session-id'),
      startedAt: '2026-10-04T14:00:01.000Z',
    });
    expect(replayed.created).toBe(false);
    expect(replayed.session.id).toBe('session-1');
    expect(store.writes).toBe(1);
    expect(JSON.parse(store.value ?? '')).toMatchObject({
      version: sessionStorageSchemaVersion,
    });
  });

  it('persists movement completion without claiming the alarm stopped', async () => {
    const store = new MemorySessionStore();
    const repository = new WakeUpSessionRepository(store);
    await repository.openOccurrence(occurrence());

    const update = await repository.applyEvent('occurrence-1', {
      type: 'movement-completed',
      at: '2026-10-04T14:01:00.000Z',
    });
    expect(update.effects).toEqual(['request-system-alarm-stop']);
    expect(update.session.challenge.status).toBe('completed');
    expect(update.session.systemAlarm.status).toBe('ringing');

    const restored = await new WakeUpSessionRepository(store).getByOccurrence(
      'occurrence-1',
    );
    expect(restored).toEqual(update.session);
  });

  it('persists a later, separately confirmed system stop', async () => {
    const store = new MemorySessionStore();
    const repository = new WakeUpSessionRepository(store);
    await repository.openOccurrence(occurrence());
    await repository.applyEvent('occurrence-1', {
      type: 'movement-completed',
      at: '2026-10-04T14:01:00.000Z',
    });
    await repository.applyEvent('occurrence-1', {
      type: 'system-alarm-stopped',
      source: 'challenge-request',
      at: '2026-10-04T14:01:02.000Z',
    });

    await expect(
      new WakeUpSessionRepository(store).getByOccurrence('occurrence-1'),
    ).resolves.toMatchObject({
      challenge: { status: 'completed' },
      systemAlarm: {
        status: 'stopped',
        stopSource: 'challenge-request',
      },
    });
  });

  it('serializes concurrent occurrence creation without losing sessions', async () => {
    const repository = new WakeUpSessionRepository(new MemorySessionStore());
    await Promise.all([
      repository.openOccurrence(occurrence()),
      repository.openOccurrence(occurrence('session-2', 'occurrence-2')),
    ]);

    await expect(repository.list()).resolves.toHaveLength(2);
  });

  it('does not rewrite storage for duplicate or ignored events', async () => {
    const store = new MemorySessionStore();
    const repository = new WakeUpSessionRepository(store);
    await repository.openOccurrence(occurrence());
    await repository.applyEvent('occurrence-1', {
      type: 'rep-progressed',
      repCount: 1,
      at: '2026-10-04T14:00:30.000Z',
    });
    const writesAfterProgress = store.writes;

    const duplicate = await repository.applyEvent('occurrence-1', {
      type: 'rep-progressed',
      repCount: 1,
      at: '2026-10-04T14:00:31.000Z',
    });
    expect(duplicate.disposition).toBe('duplicate');
    expect(store.writes).toBe(writesAfterProgress);
  });

  it('rejects invalid callback payloads before writing them', async () => {
    const store = new MemorySessionStore();
    const repository = new WakeUpSessionRepository(store);
    await repository.openOccurrence(occurrence());
    const writesBeforeInvalidEvent = store.writes;

    await expect(
      repository.applyEvent('occurrence-1', {
        type: 'fallback-used',
        reason: 'network-error',
        at: '2026-10-04T14:01:00.000Z',
      } as unknown as WakeUpSessionEvent),
    ).rejects.toThrow(/supported reason/);
    expect(store.writes).toBe(writesBeforeInvalidEvent);
  });

  it('rejects corrupt data without overwriting it', async () => {
    const store = new MemorySessionStore('{broken');
    await expect(new WakeUpSessionRepository(store).list()).rejects.toEqual(
      expect.objectContaining<Partial<SessionStorageError>>({
        code: 'invalidJson',
      }),
    );
    expect(store.value).toBe('{broken');
    expect(store.writes).toBe(0);
  });

  it('rejects unknown schemas, invalid sessions, and duplicate identities', async () => {
    const unsupported = new MemorySessionStore(
      JSON.stringify({ version: 2, sessions: [] }),
    );
    await expect(
      new WakeUpSessionRepository(unsupported).list(),
    ).rejects.toMatchObject({ code: 'unsupportedVersion' });

    const validStore = new MemorySessionStore();
    const validRepository = new WakeUpSessionRepository(validStore);
    const opened = await validRepository.openOccurrence(occurrence());
    const session = opened.session;

    for (const sessions of [
      [{ ...session, repCount: 99 }],
      [session, { ...session, id: 'session-2' }],
      [session, { ...session, occurrenceId: 'occurrence-2' }],
    ] as WakeUpSession[][]) {
      const store = new MemorySessionStore(
        JSON.stringify({ version: sessionStorageSchemaVersion, sessions }),
      );
      await expect(new WakeUpSessionRepository(store).list()).rejects.toEqual(
        expect.objectContaining<Partial<SessionStorageError>>({
          code: 'invalidData',
        }),
      );
      expect(store.writes).toBe(0);
    }
  });
});
