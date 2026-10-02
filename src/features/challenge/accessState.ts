export const cameraAvailabilities = [
  'not-connected',
  'requesting',
  'ready',
  'permission-denied',
  'unavailable',
  'interrupted',
] as const;

export type CameraAvailability = (typeof cameraAvailabilities)[number];

export type ChallengeAccessState = {
  camera: CameraAvailability;
  mode: 'movement' | 'fallback';
};

export type ChallengeAccessAction =
  | { type: 'camera-status-changed'; camera: CameraAvailability }
  | { type: 'retry-camera' }
  | { type: 'use-fallback' }
  | { type: 'return-to-movement' };

export type ChallengeRecoveryOptions = {
  canRetryCamera: boolean;
  canOpenSettings: boolean;
  canUseFallback: boolean;
};

export function createChallengeAccessState(
  camera: CameraAvailability = 'not-connected',
): ChallengeAccessState {
  return { camera, mode: 'movement' };
}

export function reduceChallengeAccess(
  state: ChallengeAccessState,
  action: ChallengeAccessAction,
): ChallengeAccessState {
  switch (action.type) {
    case 'camera-status-changed':
      return { ...state, camera: action.camera };
    case 'retry-camera':
      return state.camera === 'ready'
        ? state
        : { ...state, camera: 'requesting' };
    case 'use-fallback':
      return { ...state, mode: 'fallback' };
    case 'return-to-movement':
      return { ...state, mode: 'movement' };
  }
}

export function canProcessPoseFrames(state: ChallengeAccessState): boolean {
  return state.mode === 'movement' && state.camera === 'ready';
}

export function recoveryOptionsFor(
  state: ChallengeAccessState,
): ChallengeRecoveryOptions {
  if (state.mode === 'fallback') {
    return {
      canRetryCamera: false,
      canOpenSettings: false,
      canUseFallback: false,
    };
  }

  return {
    canRetryCamera: [
      'permission-denied',
      'unavailable',
      'interrupted',
    ].includes(state.camera),
    canOpenSettings: state.camera === 'permission-denied',
    canUseFallback: true,
  };
}
