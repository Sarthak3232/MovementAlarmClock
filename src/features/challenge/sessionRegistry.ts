import {
  applyWakeUpSessionEvent,
  createWakeUpSession,
  type CreateWakeUpSessionInput,
  type WakeUpSession,
  type WakeUpSessionEvent,
  type WakeUpSessionUpdate,
} from './session';

export type OpenOccurrenceResult = {
  sessions: WakeUpSession[];
  session: WakeUpSession;
  created: boolean;
};

export type ApplyOccurrenceEventResult = WakeUpSessionUpdate & {
  sessions: WakeUpSession[];
};

function validateCollection(sessions: WakeUpSession[]): void {
  const sessionIds = new Set<string>();
  const occurrenceIds = new Set<string>();
  for (const session of sessions) {
    if (sessionIds.has(session.id)) {
      throw new RangeError(`Duplicate wake-up session ID: ${session.id}`);
    }
    if (occurrenceIds.has(session.occurrenceId)) {
      throw new RangeError(
        `Duplicate alarm occurrence ID: ${session.occurrenceId}`,
      );
    }
    sessionIds.add(session.id);
    occurrenceIds.add(session.occurrenceId);
  }
}

/**
 * Ensures one session exists for one stable native occurrence identifier.
 * Callers can persist the returned collection; replaying the same occurrence
 * after launch or a duplicate callback returns the original session.
 */
export function openWakeUpOccurrence(
  sessions: WakeUpSession[],
  input: CreateWakeUpSessionInput,
): OpenOccurrenceResult {
  validateCollection(sessions);
  const existing = sessions.find(
    (session) => session.occurrenceId === input.occurrenceId.trim(),
  );
  if (existing) {
    if (existing.alarmId !== input.alarmId.trim()) {
      throw new RangeError(
        'An occurrence ID cannot be shared by different alarms.',
      );
    }
    return { sessions, session: existing, created: false };
  }

  if (sessions.some((session) => session.id === input.id.trim())) {
    throw new RangeError(
      `Wake-up session ID already exists: ${input.id.trim()}`,
    );
  }

  const session = createWakeUpSession(input);
  return { sessions: [...sessions, session], session, created: true };
}

export function applyEventToOccurrence(
  sessions: WakeUpSession[],
  occurrenceId: string,
  event: WakeUpSessionEvent,
): ApplyOccurrenceEventResult {
  validateCollection(sessions);
  const normalizedOccurrenceId = occurrenceId.trim();
  const index = sessions.findIndex(
    (session) => session.occurrenceId === normalizedOccurrenceId,
  );
  if (index === -1) {
    throw new RangeError(`Unknown alarm occurrence ID: ${occurrenceId}`);
  }

  const update = applyWakeUpSessionEvent(sessions[index], event);
  if (update.disposition !== 'applied') {
    return { ...update, sessions };
  }

  const nextSessions = [...sessions];
  nextSessions[index] = update.session;
  return { ...update, sessions: nextSessions };
}
