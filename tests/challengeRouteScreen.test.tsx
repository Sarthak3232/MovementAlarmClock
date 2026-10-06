import { render, screen } from '@testing-library/react-native';

import {
  applyWakeUpSessionEvent,
  ChallengeRouteScreen,
  createWakeUpSession,
  type WakeUpSession,
} from '../src/features/challenge';
import type { WakeUpSessionRepositoryApi } from '../src/features/challenge/WakeUpSessionRepositoryProvider';

function session(): WakeUpSession {
  return createWakeUpSession({
    id: 'session-1',
    alarmId: 'alarm-1',
    occurrenceId: 'occurrence-1',
    startedAt: '2026-10-06T14:00:00.000Z',
    systemAlarmStatus: 'ringing',
  });
}

function repository(
  result: WakeUpSession | null | Error,
): WakeUpSessionRepositoryApi {
  return {
    getByOccurrence: jest.fn(async () => {
      if (result instanceof Error) {
        throw result;
      }
      return result;
    }),
  };
}

describe('challenge route screen', () => {
  it('keeps the route in an explicit preview without reading storage', () => {
    const sessions = repository(null);
    render(
      <ChallengeRouteScreen
        entry={{ kind: 'preview' }}
        repository={sessions}
      />,
    );

    expect(
      screen.getByLabelText('0 of 5 jumping jacks. Preview only.'),
    ).toBeVisible();
    expect(sessions.getByOccurrence).not.toHaveBeenCalled();
  });

  it('rejects an invalid link without reading or writing storage', () => {
    const sessions = repository(null);
    render(
      <ChallengeRouteScreen
        entry={{ kind: 'invalid', message: 'Invalid occurrence.' }}
        repository={sessions}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/Invalid occurrence/);
    expect(sessions.getByOccurrence).not.toHaveBeenCalled();
  });

  it('shows a safe not-found state without creating a session', async () => {
    const sessions = repository(null);
    render(
      <ChallengeRouteScreen
        entry={{ kind: 'session', occurrenceId: 'missing' }}
        repository={sessions}
      />,
    );

    expect(screen.getByText(/Loading saved wake-up session/)).toBeVisible();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /did not create a new session/,
    );
    expect(sessions.getByOccurrence).toHaveBeenCalledWith('missing');
  });

  it('shows a storage failure without changing session data', async () => {
    render(
      <ChallengeRouteScreen
        entry={{ kind: 'session', occurrenceId: 'occurrence-1' }}
        repository={repository(new Error('corrupt store'))}
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /No session data was changed/,
    );
  });

  it('loads active progress without exposing unpersisted fallback controls', async () => {
    const progressed = applyWakeUpSessionEvent(session(), {
      type: 'rep-progressed',
      repCount: 2,
      at: '2026-10-06T14:01:00.000Z',
    }).session;
    render(
      <ChallengeRouteScreen
        entry={{ kind: 'session', occurrenceId: 'occurrence-1' }}
        repository={repository(progressed)}
      />,
    );

    expect(await screen.findByLabelText('2 of 5 jumping jacks.')).toBeVisible();
    expect(screen.getByText(/Active wake-up session loaded/)).toBeVisible();
    expect(
      screen.getByText(/still recorded as ringing.*tracked separately/),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Use non-camera fallback' }),
    ).toBeNull();
  });

  it('keeps movement completion separate from unconfirmed alarm stop', async () => {
    const completed = applyWakeUpSessionEvent(session(), {
      type: 'movement-completed',
      at: '2026-10-06T14:02:00.000Z',
    }).session;
    render(
      <ChallengeRouteScreen
        entry={{ kind: 'session', occurrenceId: 'occurrence-1' }}
        repository={repository(completed)}
      />,
    );

    expect(
      await screen.findByText('Movement challenge completed'),
    ).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent(
      /system alarm stop has not been confirmed/,
    );
  });

  it('does not present a persisted fallback as completed movement', async () => {
    const fallback = applyWakeUpSessionEvent(session(), {
      type: 'fallback-used',
      reason: 'camera-denied',
      at: '2026-10-06T14:01:00.000Z',
    }).session;
    render(
      <ChallengeRouteScreen
        entry={{ kind: 'session', occurrenceId: 'occurrence-1' }}
        repository={repository(fallback)}
      />,
    );

    expect(await screen.findByText('Fallback recorded')).toBeVisible();
    expect(screen.getByText(/not five completed jumping jacks/)).toBeVisible();
    expect(screen.queryByText('Movement challenge completed')).toBeNull();
  });
});
