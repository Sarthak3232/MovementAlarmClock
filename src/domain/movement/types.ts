export type Landmark = {
  x: number;
  y: number;
  confidence: number;
};

export type PoseLandmarks = {
  leftShoulder: Landmark;
  rightShoulder: Landmark;
  leftWrist: Landmark;
  rightWrist: Landmark;
  leftAnkle: Landmark;
  rightAnkle: Landmark;
};

export type PoseFrame = {
  timestampMs: number;
  landmarks: PoseLandmarks | null;
};

export type MovementPhase = 'seekingClosed' | 'ready' | 'open' | 'completed';

export type ClassifiedPose = 'unknown' | 'closed' | 'open' | 'transition';

export type MovementState = {
  phase: MovementPhase;
  reps: number;
  lastTimestampMs: number | null;
  stablePose: ClassifiedPose;
  candidatePose: ClassifiedPose;
  candidateSinceMs: number | null;
  trackingAvailable: boolean;
};

export type MovementEvent =
  | 'none'
  | 'repCompleted'
  | 'challengeCompleted'
  | 'trackingLost'
  | 'ignoredFrame';

export type MovementUpdate = {
  state: MovementState;
  event: MovementEvent;
};
