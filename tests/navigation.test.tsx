import { fireEvent } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import RootLayout from '../app/_layout';
import AlarmsScreen from '../app/index';
import NewAlarmScreen from '../app/alarms/new';
import ChallengeScreen from '../app/challenge';
import SettingsScreen from '../app/settings';

const routes = {
  _layout: RootLayout,
  index: AlarmsScreen,
  'alarms/new': NewAlarmScreen,
  challenge: ChallengeScreen,
  settings: SettingsScreen,
};

describe('app foundation', () => {
  it('opens alarm setup without offering a working schedule action', async () => {
    const result = renderRouter(routes, { initialUrl: '/' });
    expect(screen.getByText('No alarms yet')).toBeVisible();
    fireEvent.press(screen.getByText('Explore alarm setup'));
    expect(
      await screen.findByText('No alarm has been created or scheduled.'),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Save alarm — unavailable' }),
    ).toBeDisabled();
    expect(result.getPathname()).toBe('/alarms/new');
  });

  it('opens the challenge with zero reps and honest preview guidance', async () => {
    const result = renderRouter(routes, { initialUrl: '/' });
    fireEvent.press(screen.getByText('Preview the wake-up challenge'));
    expect(
      await screen.findByLabelText('0 of 5 jumping jacks. Preview only.'),
    ).toBeVisible();
    expect(
      screen.getByText(/camera and movement detection are not connected/),
    ).toBeVisible();
    expect(
      screen.getByText(/Stopping an iPhone system alarm is separate/),
    ).toBeVisible();
    expect(result.getPathname()).toBe('/challenge');
  });

  it('opens privacy settings from the alarm list', async () => {
    const result = renderRouter(routes, { initialUrl: '/' });
    fireEvent.press(screen.getByText('Settings and privacy'));
    expect(await screen.findByText(/without uploading video/)).toBeVisible();
    expect(result.getPathname()).toBe('/settings');
  });

  it('supports opening the challenge directly without claiming completed movement', () => {
    renderRouter(routes, { initialUrl: '/challenge' });
    expect(
      screen.getByLabelText('0 of 5 jumping jacks. Preview only.'),
    ).toBeVisible();
    expect(screen.queryByText('Challenge complete')).toBeNull();
  });
});
