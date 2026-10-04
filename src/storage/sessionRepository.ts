import {
  applyEventToOccurrence,
  openWakeUpOccurrence,
  parseWakeUpSession,
  WakeUpSessionValidationError,
  type ApplyOccurrenceEventResult,
  type CreateWakeUpSessionInput,
  type OpenOccurrenceResult,
  type WakeUpSession,
  type WakeUpSessionEvent,
} from '../features/challenge';
import type { SessionStore } from './sessionStore';

export const sessionStorageSchemaVersion = 1;

type SessionStorageErrorCode =
  'invalidJson' | 'invalidData' | 'unsupportedVersion';

export class SessionStorageError extends Error {
  constructor(
    readonly code: SessionStorageErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'SessionStorageError';
  }
}

type SessionEnvelope = {
  version: typeof sessionStorageSchemaVersion;
  sessions: WakeUpSession[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodeEnvelope(raw: string): SessionEnvelope {
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch (error) {
    throw new SessionStorageError(
      'invalidJson',
      'Stored wake-up sessions are not valid JSON.',
      { cause: error },
    );
  }

  if (!isRecord(decoded)) {
    throw new SessionStorageError(
      'invalidData',
      'Stored wake-up session data must be an object.',
    );
  }
  if (decoded.version !== sessionStorageSchemaVersion) {
    throw new SessionStorageError(
      'unsupportedVersion',
      `Wake-up session schema version ${String(decoded.version)} is not supported.`,
    );
  }
  if (!Array.isArray(decoded.sessions)) {
    throw new SessionStorageError(
      'invalidData',
      'Stored wake-up session data must include a sessions array.',
    );
  }

  let sessions: WakeUpSession[];
  try {
    sessions = decoded.sessions.map(parseWakeUpSession);
  } catch (error) {
    if (error instanceof WakeUpSessionValidationError) {
      throw new SessionStorageError(
        'invalidData',
        `A stored wake-up session is invalid: ${error.message}`,
        { cause: error },
      );
    }
    throw error;
  }

  const sessionIds = new Set<string>();
  const occurrenceIds = new Set<string>();
  for (const session of sessions) {
    if (sessionIds.has(session.id)) {
      throw new SessionStorageError(
        'invalidData',
        `Stored wake-up sessions contain duplicate ID ${session.id}.`,
      );
    }
    if (occurrenceIds.has(session.occurrenceId)) {
      throw new SessionStorageError(
        'invalidData',
        `Stored wake-up sessions contain duplicate occurrence ID ${session.occurrenceId}.`,
      );
    }
    sessionIds.add(session.id);
    occurrenceIds.add(session.occurrenceId);
  }

  return { version: sessionStorageSchemaVersion, sessions };
}

function orderSessions(sessions: WakeUpSession[]): WakeUpSession[] {
  return [...sessions].sort(
    (left, right) =>
      left.startedAt.localeCompare(right.startedAt) ||
      left.id.localeCompare(right.id),
  );
}

export class WakeUpSessionRepository {
  private mutationQueue: Promise<void> = Promise.resolve();

  constructor(private readonly store: SessionStore) {}

  async list(): Promise<WakeUpSession[]> {
    await this.mutationQueue;
    return this.readSessions();
  }

  async getByOccurrence(occurrenceId: string): Promise<WakeUpSession | null> {
    const sessions = await this.list();
    const normalizedId = occurrenceId.trim();
    return (
      sessions.find((session) => session.occurrenceId === normalizedId) ?? null
    );
  }

  async openOccurrence(
    input: CreateWakeUpSessionInput,
  ): Promise<OpenOccurrenceResult> {
    return this.enqueueMutation(async () => {
      const result = openWakeUpOccurrence(await this.readSessions(), input);
      if (result.created) {
        await this.writeSessions(result.sessions);
      }
      return result;
    });
  }

  async applyEvent(
    occurrenceId: string,
    event: WakeUpSessionEvent,
  ): Promise<ApplyOccurrenceEventResult> {
    return this.enqueueMutation(async () => {
      const result = applyEventToOccurrence(
        await this.readSessions(),
        occurrenceId,
        event,
      );
      if (result.disposition === 'applied') {
        await this.writeSessions(result.sessions);
      }
      return result;
    });
  }

  private async readSessions(): Promise<WakeUpSession[]> {
    const raw = await this.store.read();
    return raw === null ? [] : decodeEnvelope(raw).sessions;
  }

  private async writeSessions(sessions: WakeUpSession[]): Promise<void> {
    const validatedSessions = sessions.map(parseWakeUpSession);
    const envelope: SessionEnvelope = {
      version: sessionStorageSchemaVersion,
      sessions: orderSessions(validatedSessions),
    };
    await this.store.write(JSON.stringify(envelope));
  }

  private enqueueMutation<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.mutationQueue.then(operation);
    this.mutationQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}
