import { useEffect, useReducer } from 'react';
import { Button, StyleSheet, Text } from 'react-native';

import { Card, Paragraph } from '../../components/Screen';
import {
  createChallengeAccessState,
  recoveryOptionsFor,
  reduceChallengeAccess,
  type CameraAvailability,
} from './accessState';

type ChallengeExperienceProps = {
  cameraAvailability: CameraAvailability;
  currentReps?: number;
  targetReps?: number;
  onOpenSettings?: () => void;
  onRetryCamera?: () => void;
};

const cameraCopy: Record<
  CameraAvailability,
  { heading: string; message: string }
> = {
  'not-connected': {
    heading: 'Camera preview unavailable',
    message:
      'Camera and movement detection are not connected in this build. No camera permission has been requested.',
  },
  requesting: {
    heading: 'Checking camera access',
    message: 'Waiting for the on-device camera adapter to report its status.',
  },
  ready: {
    heading: 'Camera ready',
    message:
      'Keep your full body in view. Pose processing must stay on this device.',
  },
  'permission-denied': {
    heading: 'Camera access is off',
    message:
      'Allow camera access in iPhone Settings, return to the app, and retry when you are ready.',
  },
  unavailable: {
    heading: 'Camera could not start',
    message:
      'Make sure another app is not using the camera, then retry or use the non-camera fallback.',
  },
  interrupted: {
    heading: 'Challenge paused',
    message:
      'The camera feed was interrupted. Your completed rep count stays unchanged while you retry or choose the fallback.',
  },
};

export function ChallengeExperience({
  cameraAvailability,
  currentReps = 0,
  targetReps = 5,
  onOpenSettings,
  onRetryCamera,
}: ChallengeExperienceProps) {
  const [access, dispatch] = useReducer(
    reduceChallengeAccess,
    cameraAvailability,
    createChallengeAccessState,
  );

  useEffect(() => {
    dispatch({
      type: 'camera-status-changed',
      camera: cameraAvailability,
    });
  }, [cameraAvailability]);

  const recovery = recoveryOptionsFor(access);
  const copy = cameraCopy[access.camera];

  function retryCamera() {
    dispatch({ type: 'retry-camera' });
    onRetryCamera?.();
  }

  if (access.mode === 'fallback') {
    return (
      <>
        <Card>
          <Text accessibilityRole="header" style={styles.heading}>
            Non-camera fallback preview
          </Text>
          <Paragraph>
            A real wake-up session can record a fallback outcome when camera
            access or movement is unavailable. A fallback is not five completed
            jumping jacks.
          </Paragraph>
          <Text accessibilityRole="alert" style={styles.boundary}>
            This preview has not recorded an outcome or stopped an iPhone system
            alarm.
          </Text>
          <Button
            title="Return to movement options"
            onPress={() => dispatch({ type: 'return-to-movement' })}
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <Card>
        <Text
          accessibilityRole="progressbar"
          accessibilityLabel={`${currentReps} of ${targetReps} jumping jacks. Preview only.`}
          accessibilityValue={{
            min: 0,
            max: targetReps,
            now: currentReps,
            text: `${currentReps} of ${targetReps}`,
          }}
          style={styles.progress}
        >
          {currentReps} / {targetReps}
        </Text>
        <Paragraph>
          Place your phone on a stable surface, step back until your full body
          is in view, and make room to move safely.
        </Paragraph>
        <Paragraph>
          A full jumping jack starts with arms down and feet together, opens
          with arms raised and feet apart, then returns to the starting
          position.
        </Paragraph>
      </Card>
      <Card>
        <Text accessibilityRole="header" style={styles.heading}>
          {copy.heading}
        </Text>
        <Text accessibilityRole="alert" style={styles.status}>
          {copy.message}
        </Text>
        {recovery.canOpenSettings && onOpenSettings ? (
          <Button title="Open iPhone Settings" onPress={onOpenSettings} />
        ) : null}
        {recovery.canRetryCamera ? (
          <Button title="Retry camera" onPress={retryCamera} />
        ) : null}
        {recovery.canUseFallback ? (
          <Button
            title="Use non-camera fallback"
            onPress={() => dispatch({ type: 'use-fallback' })}
          />
        ) : null}
      </Card>
      <Paragraph>
        Stopping an iPhone system alarm is separate from finishing this
        challenge. Choosing a fallback must be recorded separately from movement
        completion.
      </Paragraph>
    </>
  );
}

const styles = StyleSheet.create({
  progress: {
    color: '#163e9e',
    fontSize: 64,
    fontWeight: '700',
    textAlign: 'center',
  },
  heading: { color: '#12233f', fontSize: 21, fontWeight: '700' },
  status: { color: '#405274', fontSize: 17, lineHeight: 26 },
  boundary: {
    color: '#9a2536',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 23,
  },
});
