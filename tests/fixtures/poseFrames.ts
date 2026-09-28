import type { PoseFrame, PoseLandmarks } from '../../src/domain/movement';

const confidence = 0.99;

export const closedPose: PoseLandmarks = {
  leftShoulder: { x: 0.45, y: 0.3, confidence },
  rightShoulder: { x: 0.55, y: 0.3, confidence },
  leftWrist: { x: 0.45, y: 0.65, confidence },
  rightWrist: { x: 0.55, y: 0.65, confidence },
  leftAnkle: { x: 0.47, y: 0.9, confidence },
  rightAnkle: { x: 0.53, y: 0.9, confidence },
};

export const openPose: PoseLandmarks = {
  leftShoulder: { x: 0.45, y: 0.3, confidence },
  rightShoulder: { x: 0.55, y: 0.3, confidence },
  leftWrist: { x: 0.35, y: 0.15, confidence },
  rightWrist: { x: 0.65, y: 0.15, confidence },
  leftAnkle: { x: 0.38, y: 0.9, confidence },
  rightAnkle: { x: 0.62, y: 0.9, confidence },
};

export const partialPose: PoseLandmarks = {
  ...closedPose,
  leftWrist: openPose.leftWrist,
  rightWrist: openPose.rightWrist,
};

export const openExitJitterPose: PoseLandmarks = {
  ...openPose,
  leftWrist: { x: 0.38, y: 0.27, confidence },
  rightWrist: { x: 0.62, y: 0.27, confidence },
  leftAnkle: { x: 0.435, y: 0.9, confidence },
  rightAnkle: { x: 0.565, y: 0.9, confidence },
};

export function frame(
  timestampMs: number,
  landmarks: PoseLandmarks | null,
): PoseFrame {
  return { timestampMs, landmarks };
}

export function lowConfidence(landmarks: PoseLandmarks): PoseLandmarks {
  return {
    ...landmarks,
    leftWrist: { ...landmarks.leftWrist, confidence: 0.2 },
  };
}
