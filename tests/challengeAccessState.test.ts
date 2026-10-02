import {
  canProcessPoseFrames,
  createChallengeAccessState,
  recoveryOptionsFor,
  reduceChallengeAccess,
} from '../src/features/challenge';

describe('challenge access state', () => {
  it('starts in an honest not-connected movement preview', () => {
    const state = createChallengeAccessState();
    expect(state).toEqual({ camera: 'not-connected', mode: 'movement' });
    expect(canProcessPoseFrames(state)).toBe(false);
  });

  it('accepts pose frames only while the camera is ready in movement mode', () => {
    const ready = createChallengeAccessState('ready');
    expect(canProcessPoseFrames(ready)).toBe(true);

    const fallback = reduceChallengeAccess(ready, { type: 'use-fallback' });
    expect(fallback).toEqual({ camera: 'ready', mode: 'fallback' });
    expect(canProcessPoseFrames(fallback)).toBe(false);
  });

  it('moves recoverable camera failures into a requesting state on retry', () => {
    for (const camera of [
      'permission-denied',
      'unavailable',
      'interrupted',
    ] as const) {
      expect(
        reduceChallengeAccess(createChallengeAccessState(camera), {
          type: 'retry-camera',
        }),
      ).toEqual({ camera: 'requesting', mode: 'movement' });
    }
  });

  it('preserves camera updates while fallback mode is selected', () => {
    const fallback = reduceChallengeAccess(
      createChallengeAccessState('unavailable'),
      { type: 'use-fallback' },
    );
    const readyInBackground = reduceChallengeAccess(fallback, {
      type: 'camera-status-changed',
      camera: 'ready',
    });
    expect(canProcessPoseFrames(readyInBackground)).toBe(false);
    expect(
      reduceChallengeAccess(readyInBackground, {
        type: 'return-to-movement',
      }),
    ).toEqual({ camera: 'ready', mode: 'movement' });
  });

  it('offers settings only for denied permission and retry for failures', () => {
    expect(
      recoveryOptionsFor(createChallengeAccessState('permission-denied')),
    ).toEqual({
      canRetryCamera: true,
      canOpenSettings: true,
      canUseFallback: true,
    });
    expect(
      recoveryOptionsFor(createChallengeAccessState('not-connected')),
    ).toEqual({
      canRetryCamera: false,
      canOpenSettings: false,
      canUseFallback: true,
    });
    expect(
      recoveryOptionsFor({ camera: 'unavailable', mode: 'fallback' }),
    ).toEqual({
      canRetryCamera: false,
      canOpenSettings: false,
      canUseFallback: false,
    });
  });
});
