import { File, Paths } from 'expo-file-system';

import type { SessionStore } from './sessionStore';

export const sessionStorageFileName =
  'movement-alarm-clock.wake-up-sessions.json';

export class ExpoFileSessionStore implements SessionStore {
  private readonly file = new File(Paths.document, sessionStorageFileName);

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
