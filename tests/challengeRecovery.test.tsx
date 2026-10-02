import { fireEvent, render, screen } from '@testing-library/react-native';

import { ChallengeExperience } from '../src/features/challenge';

describe('challenge recovery experience', () => {
  it('labels progress and the disconnected preview for assistive technology', () => {
    render(<ChallengeExperience cameraAvailability="not-connected" />);

    expect(
      screen.getByRole('progressbar', {
        name: '0 of 5 jumping jacks. Preview only.',
      }),
    ).toHaveAccessibilityValue({ min: 0, max: 5, now: 0, text: '0 of 5' });
    expect(screen.getByText('Camera preview unavailable')).toBeVisible();
    expect(
      screen.getByText(/No camera permission has been requested/),
    ).toBeVisible();
  });

  it('offers an honest fallback without marking movement complete', () => {
    render(<ChallengeExperience cameraAvailability="not-connected" />);

    fireEvent.press(
      screen.getByRole('button', { name: 'Use non-camera fallback' }),
    );
    expect(screen.getByText('Non-camera fallback preview')).toBeVisible();
    expect(screen.getByText(/not five completed jumping jacks/)).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent(
      /has not recorded an outcome or stopped an iPhone system alarm/,
    );
    expect(screen.queryByText('Challenge complete')).toBeNull();

    fireEvent.press(
      screen.getByRole('button', { name: 'Return to movement options' }),
    );
    expect(screen.getByText('Camera preview unavailable')).toBeVisible();
  });

  it('provides settings and retry actions after permission denial', () => {
    const openSettings = jest.fn();
    const retryCamera = jest.fn();
    render(
      <ChallengeExperience
        cameraAvailability="permission-denied"
        onOpenSettings={openSettings}
        onRetryCamera={retryCamera}
      />,
    );

    fireEvent.press(
      screen.getByRole('button', { name: 'Open iPhone Settings' }),
    );
    expect(openSettings).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByRole('button', { name: 'Retry camera' }));
    expect(retryCamera).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Checking camera access')).toBeVisible();
  });

  it.each([
    ['unavailable', 'Camera could not start'],
    ['interrupted', 'Challenge paused'],
  ] as const)(
    'offers retry and fallback when camera is %s',
    (camera, heading) => {
      render(<ChallengeExperience cameraAvailability={camera} />);
      expect(screen.getByText(heading)).toBeVisible();
      expect(
        screen.getByRole('button', { name: 'Retry camera' }),
      ).toBeEnabled();
      expect(
        screen.getByRole('button', { name: 'Use non-camera fallback' }),
      ).toBeEnabled();
    },
  );

  it('announces injected rep progress without claiming completion', () => {
    render(
      <ChallengeExperience
        cameraAvailability="ready"
        currentReps={3}
        targetReps={5}
      />,
    );
    expect(
      screen.getByRole('progressbar', {
        name: '3 of 5 jumping jacks. Preview only.',
      }),
    ).toHaveAccessibilityValue({ min: 0, max: 5, now: 3, text: '3 of 5' });
    expect(screen.queryByText('Challenge complete')).toBeNull();
  });
});
