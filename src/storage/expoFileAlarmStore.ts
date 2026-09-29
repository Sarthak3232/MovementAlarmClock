import { File, Paths } from 'expo-file-system';

import type { AlarmStore } from './alarmStore';

export const alarmStorageFileName = 'movement-alarm-clock.alarms.json';

export class ExpoFileAlarmStore implements AlarmStore {
  private readonly file = new File(Paths.document, alarmStorageFileName);

  async read(): Promise<string | null> {
    return this.file.exists ? this.file.text() : null;
  }

  async write(value: string): Promise<void> {
    this.file.create({ intermediates: true, overwrite: true });
    this.file.write(value);
  }

  async clear(): Promise<void> {
    if (this.file.exists) {
      this.file.delete();
    }
  }
}
