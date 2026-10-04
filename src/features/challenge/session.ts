export const defaultMovementTarget = 5;

export type FallbackReason =
  'camera-denied' | 'camera-unavailable' | 'movement-unavailable' | 'other';

export type ChallengeOutcome =
  | { status: 'active'; endedAt: null; fallbackReason: null }
  | { status: 'completed'; endedAt: string; fallbackReason: null }
  | { status: 'abandoned'; endedAt: string; fallbackReason: null }
  | { status: 'fallback'; endedAt: string; fallbackReason: FallbackReason };

export type SystemAlarmLifecycle =
  | {
      status: 'unknown' | 'ringing';
      stoppedAt: null;
      stopSource: null;
    }
  | {
      status: 'stopped';
      stoppedAt: string;
      stopSource: 'system-control' | 'challenge-request';
    };

export type WakeUpSession = {
  id: string;
  alarmId: string;
  occurrenceId: string;
  startedAt: string;
  updatedAt: string;
  targetReps: number;
  repCount: number;
  challenge: ChallengeOutcome;
  systemAlarm: SystemAlarmLifecycle;
};

export type CreateWakeUpSessionInput = {
  id: string;
  alarmId: string;
  occurrenceId: string;
  startedAt: string;
  targetReps?: number;
  systemAlarmStatus?: 'unknown' | 'ringing';
};

export type WakeUpSessionEvent =
  | { type: 'rep-progressed'; repCount: number; at: string }
  | { type: 'movement-completed'; at: string }
  | { type: 'fallback-used'; reason: FallbackReason; at: string }
  | { type: 'abandoned'; at: string }
  | {
      type: 'system-alarm-stopped';
      source: 'system-control' | 'challenge-request';
      at: string;
    };

export type WakeUpSessionEffect = 'request-system-alarm-stop';

export type WakeUpSessionUpdate = {
  session: WakeUpSession;
  disposition: 'applied' | 'duplicate' | 'ignored';
  effects: WakeUpSessionEffect[];
};

export class WakeUpSessionValidationError extends Error {
  constructor(
    readonly path: string,
    message: string,
  ) {
    super(`${path}: ${message}`);
    this.name = 'WakeUpSessionValidationError';
  }
}

function validationFailure(path: string, message: string): never {
  throw new WakeUpSessionValidationError(path, message);
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    validationFailure(path, 'must be an object');
  }
  return value as Record<string, unknown>;
}

function persistedNonEmpty(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    validationFailure(path, 'must be a non-empty string');
  }
  return value.trim();
}

function persistedTimestamp(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    validationFailure(path, 'must be a canonical ISO timestamp');
  }
  try {
    return canonicalTimestamp(value, path);
  } catch {
    return validationFailure(path, 'must be a canonical ISO timestamp');
  }
}

function persistedInteger(value: unknown, path: string): number {
  if (!Number.isInteger(value)) {
    validationFailure(path, 'must be an integer');
  }
  return value as number;
}

const fallbackReasons: FallbackReason[] = [
  'camera-denied',
  'camera-unavailable',
  'movement-unavailable',
  'other',
];

function parseChallenge(
  value: unknown,
  startedAt: string,
  updatedAt: string,
): ChallengeOutcome {
  const input = record(value, 'challenge');
  if (input.status === 'active') {
    if (input.endedAt !== null || input.fallbackReason !== null) {
      validationFailure(
        'challenge',
        'an active challenge cannot have an end time or fallback reason',
      );
    }
    return { status: 'active', endedAt: null, fallbackReason: null };
  }

  if (
    input.status !== 'completed' &&
    input.status !== 'abandoned' &&
    input.status !== 'fallback'
  ) {
    validationFailure(
      'challenge.status',
      'must be active, completed, abandoned, or fallback',
    );
  }
  const endedAt = persistedTimestamp(input.endedAt, 'challenge.endedAt');
  if (endedAt < startedAt || endedAt > updatedAt) {
    validationFailure(
      'challenge.endedAt',
      'must fall between the session start and latest update',
    );
  }
  if (input.status === 'fallback') {
    if (!fallbackReasons.includes(input.fallbackReason as FallbackReason)) {
      validationFailure(
        'challenge.fallbackReason',
        'must be a supported fallback reason',
      );
    }
    return {
      status: 'fallback',
      endedAt,
      fallbackReason: input.fallbackReason as FallbackReason,
    };
  }
  if (input.fallbackReason !== null) {
    validationFailure(
      'challenge.fallbackReason',
      'must be null unless fallback was used',
    );
  }
  return { status: input.status, endedAt, fallbackReason: null };
}

function parseSystemAlarm(
  value: unknown,
  startedAt: string,
  updatedAt: string,
): SystemAlarmLifecycle {
  const input = record(value, 'systemAlarm');
  if (input.status === 'unknown' || input.status === 'ringing') {
    if (input.stoppedAt !== null || input.stopSource !== null) {
      validationFailure(
        'systemAlarm',
        'an alarm that is not stopped cannot have stop metadata',
      );
    }
    return { status: input.status, stoppedAt: null, stopSource: null };
  }
  if (input.status !== 'stopped') {
    validationFailure(
      'systemAlarm.status',
      'must be unknown, ringing, or stopped',
    );
  }
  const stoppedAt = persistedTimestamp(
    input.stoppedAt,
    'systemAlarm.stoppedAt',
  );
  if (stoppedAt < startedAt || stoppedAt > updatedAt) {
    validationFailure(
      'systemAlarm.stoppedAt',
      'must fall between the session start and latest update',
    );
  }
  if (
    input.stopSource !== 'system-control' &&
    input.stopSource !== 'challenge-request'
  ) {
    validationFailure(
      'systemAlarm.stopSource',
      'must identify a system control or challenge request',
    );
  }
  return { status: 'stopped', stoppedAt, stopSource: input.stopSource };
}

export function parseWakeUpSession(value: unknown): WakeUpSession {
  const input = record(value, 'session');
  const startedAt = persistedTimestamp(input.startedAt, 'startedAt');
  const updatedAt = persistedTimestamp(input.updatedAt, 'updatedAt');
  if (updatedAt < startedAt) {
    validationFailure('updatedAt', 'must not precede startedAt');
  }

  const targetReps = persistedInteger(input.targetReps, 'targetReps');
  if (targetReps < 1) {
    validationFailure('targetReps', 'must be positive');
  }
  const repCount = persistedInteger(input.repCount, 'repCount');
  if (repCount < 0 || repCount > targetReps) {
    validationFailure('repCount', 'must be between zero and targetReps');
  }

  const challenge = parseChallenge(input.challenge, startedAt, updatedAt);
  if ((challenge.status === 'completed') !== (repCount === targetReps)) {
    validationFailure(
      'repCount',
      'must equal targetReps exactly when movement is completed',
    );
  }

  return {
    id: persistedNonEmpty(input.id, 'id'),
    alarmId: persistedNonEmpty(input.alarmId, 'alarmId'),
    occurrenceId: persistedNonEmpty(input.occurrenceId, 'occurrenceId'),
    startedAt,
    updatedAt,
    targetReps,
    repCount,
    challenge,
    systemAlarm: parseSystemAlarm(input.systemAlarm, startedAt, updatedAt),
  };
}

function nonEmpty(value: string, field: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new RangeError(`${field} must be a non-empty string.`);
  }
  return normalized;
}

function canonicalTimestamp(value: string, field: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new RangeError(`${field} must be a canonical ISO timestamp.`);
  }
  return value;
}

function eventTimestamp(session: WakeUpSession, value: string): string {
  const timestamp = canonicalTimestamp(value, 'event.at');
  if (timestamp < session.startedAt) {
    throw new RangeError('A session event cannot precede the session start.');
  }
  return timestamp;
}

function applied(
  session: WakeUpSession,
  effects: WakeUpSessionEffect[] = [],
): WakeUpSessionUpdate {
  return { session, disposition: 'applied', effects };
}

function unchanged(
  session: WakeUpSession,
  disposition: 'duplicate' | 'ignored',
): WakeUpSessionUpdate {
  return { session, disposition, effects: [] };
}

function withUpdatedAt(session: WakeUpSession, at: string): WakeUpSession {
  return {
    ...session,
    updatedAt: at > session.updatedAt ? at : session.updatedAt,
  };
}

export function createWakeUpSession(
  input: CreateWakeUpSessionInput,
): WakeUpSession {
  const targetReps = input.targetReps ?? defaultMovementTarget;
  if (!Number.isInteger(targetReps) || targetReps < 1) {
    throw new RangeError('targetReps must be a positive integer.');
  }
  const startedAt = canonicalTimestamp(input.startedAt, 'startedAt');
  const systemAlarmStatus = input.systemAlarmStatus ?? 'unknown';
  if (systemAlarmStatus !== 'unknown' && systemAlarmStatus !== 'ringing') {
    throw new RangeError(
      'systemAlarmStatus must be either unknown or ringing.',
    );
  }

  return {
    id: nonEmpty(input.id, 'id'),
    alarmId: nonEmpty(input.alarmId, 'alarmId'),
    occurrenceId: nonEmpty(input.occurrenceId, 'occurrenceId'),
    startedAt,
    updatedAt: startedAt,
    targetReps,
    repCount: 0,
    challenge: { status: 'active', endedAt: null, fallbackReason: null },
    systemAlarm: {
      status: systemAlarmStatus,
      stoppedAt: null,
      stopSource: null,
    },
  };
}

export function applyWakeUpSessionEvent(
  session: WakeUpSession,
  event: WakeUpSessionEvent,
): WakeUpSessionUpdate {
  const at = eventTimestamp(session, event.at);

  switch (event.type) {
    case 'rep-progressed': {
      if (!Number.isInteger(event.repCount) || event.repCount < 0) {
        throw new RangeError('repCount must be a non-negative integer.');
      }
      if (event.repCount >= session.targetReps) {
        throw new RangeError(
          'Use movement-completed when the target rep count is reached.',
        );
      }
      if (session.challenge.status !== 'active') {
        return unchanged(session, 'ignored');
      }
      if (event.repCount === session.repCount) {
        return unchanged(session, 'duplicate');
      }
      if (event.repCount < session.repCount) {
        return unchanged(session, 'ignored');
      }
      return applied(
        withUpdatedAt({ ...session, repCount: event.repCount }, at),
      );
    }

    case 'movement-completed': {
      if (session.challenge.status === 'completed') {
        return unchanged(session, 'duplicate');
      }
      if (session.challenge.status !== 'active') {
        return unchanged(session, 'ignored');
      }
      const effects: WakeUpSessionEffect[] =
        session.systemAlarm.status === 'ringing'
          ? ['request-system-alarm-stop']
          : [];
      return applied(
        withUpdatedAt(
          {
            ...session,
            repCount: session.targetReps,
            challenge: {
              status: 'completed',
              endedAt: at,
              fallbackReason: null,
            },
          },
          at,
        ),
        effects,
      );
    }

    case 'fallback-used': {
      if (!fallbackReasons.includes(event.reason)) {
        throw new RangeError('fallback-used requires a supported reason.');
      }
      if (session.challenge.status === 'fallback') {
        return unchanged(session, 'duplicate');
      }
      if (session.challenge.status !== 'active') {
        return unchanged(session, 'ignored');
      }
      return applied(
        withUpdatedAt(
          {
            ...session,
            challenge: {
              status: 'fallback',
              endedAt: at,
              fallbackReason: event.reason,
            },
          },
          at,
        ),
      );
    }

    case 'abandoned': {
      if (session.challenge.status === 'abandoned') {
        return unchanged(session, 'duplicate');
      }
      if (session.challenge.status !== 'active') {
        return unchanged(session, 'ignored');
      }
      return applied(
        withUpdatedAt(
          {
            ...session,
            challenge: {
              status: 'abandoned',
              endedAt: at,
              fallbackReason: null,
            },
          },
          at,
        ),
      );
    }

    case 'system-alarm-stopped': {
      if (
        event.source !== 'system-control' &&
        event.source !== 'challenge-request'
      ) {
        throw new RangeError(
          'system-alarm-stopped requires a supported stop source.',
        );
      }
      if (session.systemAlarm.status === 'stopped') {
        return unchanged(session, 'duplicate');
      }
      return applied(
        withUpdatedAt(
          {
            ...session,
            systemAlarm: {
              status: 'stopped',
              stoppedAt: at,
              stopSource: event.source,
            },
          },
          at,
        ),
      );
    }
  }
}
