import { fireEvent } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

import RootLayout from '../app/_layout';
import EditAlarmScreen from '../app/alarms/[id]';
import NewAlarmScreen from '../app/alarms/new';
import ChallengeScreen from '../app/challenge';
import AlarmsScreen from '../app/index';
import SettingsScreen from '../app/settings';

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

const routes = {
  _layout: RootLayout,
  index: AlarmsScreen,
  'alarms/new': NewAlarmScreen,
  'alarms/[id]': EditAlarmScreen,
  challenge: ChallengeScreen,
  settings: SettingsScreen,
};

describe('saved alarm CRUD', () => {
  beforeEach(() => {
    mockFiles.clear();
  });

  it('creates, reloads, edits, and deletes an unscheduled alarm', async () => {
    renderRouter(routes, { initialUrl: '/' });
    expect(await screen.findByText('No alarms yet')).toBeVisible();

    fireEvent.press(screen.getByText('Add a saved alarm'));
    fireEvent.changeText(screen.getByLabelText('Alarm name'), 'Class alarm');
    fireEvent.changeText(screen.getByLabelText('Hour, 0 through 23'), '8');
    fireEvent.changeText(screen.getByLabelText('Minute, 0 through 59'), '15');
    fireEvent.press(screen.getByRole('button', { name: 'Save alarm' }));

    expect(await screen.findByText('Class alarm')).toBeVisible();
    expect(screen.getByText('8:15 AM')).toBeVisible();
    expect(screen.getByText('Saved only — not scheduled')).toBeVisible();

    fireEvent.press(screen.getByText('Edit Class alarm'));
    const nameInput = await screen.findByLabelText('Alarm name');
    fireEvent.changeText(nameInput, 'Later class alarm');
    fireEvent.press(screen.getByRole('button', { name: 'Save alarm' }));

    expect(await screen.findByText('Later class alarm')).toBeVisible();
    expect(screen.queryByText('Class alarm')).toBeNull();
    fireEvent.press(
      screen.getByRole('button', { name: 'Delete Later class alarm' }),
    );
    expect(await screen.findByText('No alarms yet')).toBeVisible();
  });

  it('shows validation errors without writing invalid local time', async () => {
    renderRouter(routes, { initialUrl: '/alarms/new' });
    fireEvent.changeText(screen.getByLabelText('Hour, 0 through 23'), '24');
    fireEvent.press(screen.getByRole('button', { name: 'Save alarm' }));

    expect(
      await screen.findByRole('alert', {
        name: 'Enter a value from 0 through 23.',
      }),
    ).toBeVisible();
    expect(mockFiles.size).toBe(0);
  });
});
