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
