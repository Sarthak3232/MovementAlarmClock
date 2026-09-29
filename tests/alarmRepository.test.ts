import {
  AlarmRepository,
  AlarmStorageError,
  alarmStorageSchemaVersion,
  type AlarmStore,
} from '../src/storage';
import type { Alarm } from '../src/features/alarms';

class MemoryAlarmStore implements AlarmStore {
  constructor(public value: string | null = null) {}

  async read() {
    return this.value;
  }

  async write(value: string) {
    this.value = value;
  }

  async clear() {
    this.value = null;
  }
}

function alarm(id: string, overrides: Partial<Alarm> = {}): Alarm {
  return {
    id,
    label: `Alarm ${id}`,
    time: { hour: 7, minute: 30 },
    repeatWeekdays: [1, 2, 3, 4, 5],
    enabled: false,
    scheduling: { status: 'unscheduled', nativeId: null, error: null },
    createdAt: '2026-09-29T12:00:00.000Z',
    updatedAt: '2026-09-29T12:00:00.000Z',
    ...overrides,
  };
}

describe('alarm repository', () => {
  it('reloads alarms from a new repository instance', async () => {
    const store = new MemoryAlarmStore();
    await new AlarmRepository(store).save(alarm('weekday'));

    await expect(new AlarmRepository(store).list()).resolves.toEqual([
      alarm('weekday'),
    ]);
    expect(JSON.parse(store.value ?? '')).toMatchObject({
      version: alarmStorageSchemaVersion,
    });
  });

  it('upserts and deletes by stable alarm ID', async () => {
    const store = new MemoryAlarmStore();
    const repository = new AlarmRepository(store);
    await repository.save(alarm('weekend'));
    await repository.save(
      alarm('weekend', {
        label: 'Later weekend alarm',
        updatedAt: '2026-09-29T13:00:00.000Z',
      }),
    );

    await expect(repository.list()).resolves.toEqual([
      alarm('weekend', {
        label: 'Later weekend alarm',
        updatedAt: '2026-09-29T13:00:00.000Z',
      }),
    ]);
    await expect(repository.delete('weekend')).resolves.toBe(true);
    await expect(repository.delete('missing')).resolves.toBe(false);
    expect(store.value).toBeNull();
  });

  it('serializes concurrent writes without losing an alarm', async () => {
    const repository = new AlarmRepository(new MemoryAlarmStore());

    await Promise.all([
      repository.save(alarm('first')),
      repository.save(alarm('second')),
    ]);

    await expect(repository.list()).resolves.toEqual([
      alarm('first'),
      alarm('second'),
    ]);
  });

  it('rejects corrupt JSON without overwriting it', async () => {
    const store = new MemoryAlarmStore('{broken');

    await expect(new AlarmRepository(store).list()).rejects.toEqual(
      expect.objectContaining<Partial<AlarmStorageError>>({
        code: 'invalidJson',
      }),
    );
    expect(store.value).toBe('{broken');
  });

  it('rejects unknown schema versions instead of guessing a migration', async () => {
    const store = new MemoryAlarmStore(
      JSON.stringify({ version: 2, alarms: [] }),
    );

    await expect(new AlarmRepository(store).list()).rejects.toEqual(
      expect.objectContaining<Partial<AlarmStorageError>>({
        code: 'unsupportedVersion',
      }),
    );
  });

  it('rejects invalid and duplicate records from storage', async () => {
    const duplicate = alarm('duplicate');
    const store = new MemoryAlarmStore(
      JSON.stringify({
        version: alarmStorageSchemaVersion,
        alarms: [duplicate, duplicate],
      }),
    );

    await expect(new AlarmRepository(store).list()).rejects.toEqual(
      expect.objectContaining<Partial<AlarmStorageError>>({
        code: 'invalidData',
      }),
    );
  });
});
