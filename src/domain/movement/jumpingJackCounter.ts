import type {
  ClassifiedPose,
  Landmark,
  MovementState,
  MovementUpdate,
  PoseFrame,
  PoseLandmarks,
} from './types';

export type JumpingJackConfig = {
  targetReps: number;
  minConfidence: number;
  stableDurationMs: number;
  maxFrameGapMs: number;
  openArmRaiseRatio: number;
  openFeetRatio: number;
  openExitArmRaiseRatio: number;
  openExitFeetRatio: number;
  closedArmDropRatio: number;
  closedFeetRatio: number;
  closedExitArmDropRatio: number;
  closedExitFeetRatio: number;
};

export const defaultJumpingJackConfig: JumpingJackConfig = {
  targetReps: 5,
  minConfidence: 0.6,
  stableDurationMs: 250,
  maxFrameGapMs: 1_000,
  openArmRaiseRatio: 0.12,
  openFeetRatio: 1.5,
  openExitArmRaiseRatio: 0.02,
  openExitFeetRatio: 1.25,
  closedArmDropRatio: 0.18,
  closedFeetRatio: 1,
  closedExitArmDropRatio: 0.08,
  closedExitFeetRatio: 1.2,
};

const trackedLandmarks = (landmarks: PoseLandmarks): Landmark[] => [
  landmarks.leftShoulder,
  landmarks.rightShoulder,
  landmarks.leftWrist,
  landmarks.rightWrist,
  landmarks.leftAnkle,
  landmarks.rightAnkle,
];

function allLandmarksConfident(
  landmarks: PoseLandmarks,
  minConfidence: number,
) {
  return trackedLandmarks(landmarks).every(
    ({ x, y, confidence }) =>
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      Number.isFinite(confidence) &&
      confidence >= minConfidence,
  );
}

function measurements(landmarks: PoseLandmarks) {
  const shoulderY = (landmarks.leftShoulder.y + landmarks.rightShoulder.y) / 2;
  const ankleY = (landmarks.leftAnkle.y + landmarks.rightAnkle.y) / 2;
  const bodyHeight = Math.abs(ankleY - shoulderY);
  const shoulderWidth = Math.abs(
    landmarks.rightShoulder.x - landmarks.leftShoulder.x,
  );

  if (bodyHeight < 0.1 || shoulderWidth < 0.03) {
    return null;
  }

  return {
    leftArmRaise: (shoulderY - landmarks.leftWrist.y) / bodyHeight,
    rightArmRaise: (shoulderY - landmarks.rightWrist.y) / bodyHeight,
    leftArmDrop: (landmarks.leftWrist.y - shoulderY) / bodyHeight,
    rightArmDrop: (landmarks.rightWrist.y - shoulderY) / bodyHeight,
    feetRatio:
      Math.abs(landmarks.rightAnkle.x - landmarks.leftAnkle.x) / shoulderWidth,
  };
}

export function classifyPose(
  landmarks: PoseLandmarks,
  previousPose: ClassifiedPose,
  config: JumpingJackConfig = defaultJumpingJackConfig,
): ClassifiedPose {
  if (!allLandmarksConfident(landmarks, config.minConfidence)) {
    return 'unknown';
  }

  const values = measurements(landmarks);
  if (!values) {
    return 'unknown';
  }

  const maintainsOpen =
    previousPose === 'open' &&
    values.leftArmRaise >= config.openExitArmRaiseRatio &&
    values.rightArmRaise >= config.openExitArmRaiseRatio &&
    values.feetRatio >= config.openExitFeetRatio;
  const entersOpen =
    values.leftArmRaise >= config.openArmRaiseRatio &&
    values.rightArmRaise >= config.openArmRaiseRatio &&
    values.feetRatio >= config.openFeetRatio;

  if (maintainsOpen || entersOpen) {
    return 'open';
  }

  const maintainsClosed =
    previousPose === 'closed' &&
    values.leftArmDrop >= config.closedExitArmDropRatio &&
    values.rightArmDrop >= config.closedExitArmDropRatio &&
    values.feetRatio <= config.closedExitFeetRatio;
  const entersClosed =
    values.leftArmDrop >= config.closedArmDropRatio &&
    values.rightArmDrop >= config.closedArmDropRatio &&
    values.feetRatio <= config.closedFeetRatio;

  if (maintainsClosed || entersClosed) {
    return 'closed';
  }

  return 'transition';
}

export function createMovementState(): MovementState {
  return {
    phase: 'seekingClosed',
    reps: 0,
    lastTimestampMs: null,
    stablePose: 'unknown',
    candidatePose: 'unknown',
    candidateSinceMs: null,
    trackingAvailable: false,
  };
}

function resetUnfinishedMovement(
  state: MovementState,
  timestampMs: number,
): MovementState {
  return {
    ...state,
    phase: state.phase === 'completed' ? 'completed' : 'seekingClosed',
    lastTimestampMs: timestampMs,
    stablePose: 'unknown',
    candidatePose: 'unknown',
    candidateSinceMs: null,
    trackingAvailable: false,
  };
}

function acceptStablePose(
  state: MovementState,
  pose: ClassifiedPose,
  config: JumpingJackConfig,
): MovementUpdate {
  if (pose === 'closed' && state.phase === 'seekingClosed') {
    return {
      state: { ...state, phase: 'ready', stablePose: pose },
      event: 'none',
    };
  }

  if (pose === 'open' && state.phase === 'ready') {
    return {
      state: { ...state, phase: 'open', stablePose: pose },
      event: 'none',
    };
  }

  if (pose === 'closed' && state.phase === 'open') {
    const reps = state.reps + 1;
    const completed = reps >= config.targetReps;
    return {
      state: {
        ...state,
        phase: completed ? 'completed' : 'ready',
        reps,
        stablePose: pose,
      },
      event: completed ? 'challengeCompleted' : 'repCompleted',
    };
  }

  return { state: { ...state, stablePose: pose }, event: 'none' };
}

export function processPoseFrame(
  state: MovementState,
  frame: PoseFrame,
  config: JumpingJackConfig = defaultJumpingJackConfig,
): MovementUpdate {
  if (
    !Number.isFinite(frame.timestampMs) ||
    (state.lastTimestampMs !== null &&
      frame.timestampMs <= state.lastTimestampMs)
  ) {
    return { state, event: 'ignoredFrame' };
  }

  if (state.phase === 'completed') {
    return {
      state: { ...state, lastTimestampMs: frame.timestampMs },
      event: 'ignoredFrame',
    };
  }

  const frameGap =
    state.lastTimestampMs === null
      ? 0
      : frame.timestampMs - state.lastTimestampMs;
  let nextState =
    frameGap > config.maxFrameGapMs
      ? resetUnfinishedMovement(state, frame.timestampMs)
      : { ...state, lastTimestampMs: frame.timestampMs };

  if (!frame.landmarks) {
    return {
      state: resetUnfinishedMovement(nextState, frame.timestampMs),
      event: 'trackingLost',
    };
  }

  const previousPose =
    nextState.candidatePose === 'open' || nextState.candidatePose === 'closed'
      ? nextState.candidatePose
      : nextState.stablePose;
  const pose = classifyPose(frame.landmarks, previousPose, config);

  if (pose === 'unknown') {
    return {
      state: resetUnfinishedMovement(nextState, frame.timestampMs),
      event: 'trackingLost',
    };
  }

  nextState = { ...nextState, trackingAvailable: true };

  if (pose === 'transition') {
    return {
      state: {
        ...nextState,
        candidatePose: 'transition',
        candidateSinceMs: null,
      },
      event: 'none',
    };
  }

  if (pose !== nextState.candidatePose) {
    return {
      state: {
        ...nextState,
        candidatePose: pose,
        candidateSinceMs: frame.timestampMs,
      },
      event: 'none',
    };
  }

  if (
    nextState.candidateSinceMs === null ||
    frame.timestampMs - nextState.candidateSinceMs < config.stableDurationMs
  ) {
    return { state: nextState, event: 'none' };
  }

  const accepted = acceptStablePose(nextState, pose, config);
  return {
    state: {
      ...accepted.state,
      candidatePose: 'unknown',
      candidateSinceMs: null,
    },
    event: accepted.event,
  };
}
