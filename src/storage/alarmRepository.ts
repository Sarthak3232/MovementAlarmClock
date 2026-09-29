import {
  AlarmValidationError,
  parseAlarm,
  type Alarm,
} from '../features/alarms';
import type { AlarmStore } from './alarmStore';

export const alarmStorageSchemaVersion = 1;

type AlarmStorageErrorCode =
  'invalidJson' | 'invalidData' | 'unsupportedVersion';

export class AlarmStorageError extends Error {
  constructor(
    readonly code: AlarmStorageErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'AlarmStorageError';
  }
}

type AlarmEnvelope = {
  version: typeof alarmStorageSchemaVersion;
  alarms: Alarm[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodeEnvelope(raw: string): AlarmEnvelope {
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch (error) {
    throw new AlarmStorageError(
      'invalidJson',
      'Stored alarms are not valid JSON.',
      { cause: error },
    );
  }

  if (!isRecord(decoded)) {
    throw new AlarmStorageError(
      'invalidData',
      'Stored alarm data must be an object.',
    );
  }
  if (decoded.version !== alarmStorageSchemaVersion) {
    throw new AlarmStorageError(
      'unsupportedVersion',
      `Alarm schema version ${String(decoded.version)} is not supported.`,
    );
  }
  if (!Array.isArray(decoded.alarms)) {
    throw new AlarmStorageError(
      'invalidData',
      'Stored alarm data must include an alarms array.',
    );
  }

  let alarms: Alarm[];
  try {
    alarms = decoded.alarms.map(parseAlarm);
  } catch (error) {
    if (error instanceof AlarmValidationError) {
      throw new AlarmStorageError(
        'invalidData',
        `A stored alarm is invalid: ${error.message}`,
        { cause: error },
      );
    }
    throw error;
  }

  const identifiers = new Set<string>();
  for (const alarm of alarms) {
    if (identifiers.has(alarm.id)) {
      throw new AlarmStorageError(
        'invalidData',
        `Stored alarms contain duplicate ID ${alarm.id}.`,
      );
    }
    identifiers.add(alarm.id);
  }

  return { version: alarmStorageSchemaVersion, alarms };
}

function orderAlarms(alarms: Alarm[]): Alarm[] {
  return [...alarms].sort(
    (left, right) =>
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id),
  );
}

export class AlarmRepository {
  private mutationQueue: Promise<void> = Promise.resolve();

  constructor(private readonly store: AlarmStore) {}

  async list(): Promise<Alarm[]> {
    await this.mutationQueue;
    return this.readAlarms();
  }

  async get(id: string): Promise<Alarm | null> {
    const alarms = await this.list();
    return alarms.find((alarm) => alarm.id === id) ?? null;
  }

  async save(value: Alarm): Promise<Alarm> {
    const alarm = parseAlarm(value);
    return this.enqueueMutation(async () => {
      const alarms = await this.readAlarms();
      const existingIndex = alarms.findIndex(({ id }) => id === alarm.id);
      if (existingIndex === -1) {
        alarms.push(alarm);
      } else {
        alarms[existingIndex] = alarm;
      }
      await this.writeAlarms(alarms);
      return alarm;
    });
  }

  async delete(id: string): Promise<boolean> {
    return this.enqueueMutation(async () => {
      const alarms = await this.readAlarms();
      const remaining = alarms.filter((alarm) => alarm.id !== id);
      if (remaining.length === alarms.length) {
        return false;
      }
      if (remaining.length === 0) {
        await this.store.clear();
      } else {
        await this.writeAlarms(remaining);
      }
      return true;
    });
  }

  private async readAlarms(): Promise<Alarm[]> {
    const raw = await this.store.read();
    return raw === null ? [] : decodeEnvelope(raw).alarms;
  }

  private async writeAlarms(alarms: Alarm[]): Promise<void> {
    const envelope: AlarmEnvelope = {
      version: alarmStorageSchemaVersion,
      alarms: orderAlarms(alarms),
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
