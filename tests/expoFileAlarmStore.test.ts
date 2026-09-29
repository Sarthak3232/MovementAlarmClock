import { ExpoFileAlarmStore } from '../src/storage/expoFileAlarmStore';

const mockFiles = new Map<string, string>();

jest.mock('expo-file-system', () => ({
  Paths: { document: 'document://' },
  File: class MockFile {
    private readonly path: string;

    constructor(...parts: string[]) {
      this.path = parts.join('/');
    }

    get exists() {
      return mockFiles.has(this.path);
    }

    async text() {
      return mockFiles.get(this.path) ?? '';
    }

    create() {
      mockFiles.set(this.path, '');
    }

    write(value: string) {
      mockFiles.set(this.path, value);
    }

    delete() {
      mockFiles.delete(this.path);
    }
  },
}));

describe('Expo file alarm store', () => {
  beforeEach(() => {
    mockFiles.clear();
  });

  it('reads data written by a new store instance', async () => {
    await new ExpoFileAlarmStore().write('{"version":1}');

    await expect(new ExpoFileAlarmStore().read()).resolves.toBe(
      '{"version":1}',
    );
  });

  it('returns null when absent and clears existing data', async () => {
    const store = new ExpoFileAlarmStore();
    await expect(store.read()).resolves.toBeNull();

    await store.write('saved');
    await store.clear();
    await expect(store.read()).resolves.toBeNull();
  });
});
