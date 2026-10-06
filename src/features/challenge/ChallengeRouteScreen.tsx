import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Card, Paragraph, Screen } from '../../components/Screen';
import { ChallengeExperience } from './ChallengeExperience';
import type { ChallengeRouteEntry } from './routeEntry';
import type { WakeUpSession } from './session';
import type { WakeUpSessionRepositoryApi } from './WakeUpSessionRepositoryProvider';

type ChallengeRouteScreenProps = {
  entry: ChallengeRouteEntry;
  repository: WakeUpSessionRepositoryApi;
  onOpenSettings?: () => void;
};

type SessionLoadState =
  | { occurrenceId: string | null; status: 'loading' }
  | { occurrenceId: string; status: 'ready'; session: WakeUpSession }
  | { occurrenceId: string; status: 'missing' }
  | { occurrenceId: string; status: 'failed' };

function systemAlarmMessage(session: WakeUpSession): string {
  if (session.systemAlarm.status === 'stopped') {
    return session.systemAlarm.stopSource === 'system-control'
      ? 'The system alarm was stopped through its system control.'
      : 'The system alarm stop requested by the challenge was confirmed.';
  }
  if (session.systemAlarm.status === 'ringing') {
    return 'The system alarm is still recorded as ringing.';
  }
  return 'The app has not received the system alarm state.';
}

function SessionResult({ session }: { session: WakeUpSession }) {
  const challenge = session.challenge;
  if (challenge.status === 'active') {
    return (
      <>
        <Paragraph>
          Active wake-up session loaded. Camera and movement adapters are not
          connected in this build.
        </Paragraph>
        <ChallengeExperience
          cameraAvailability="not-connected"
          currentReps={session.repCount}
          targetReps={session.targetReps}
          preview={false}
          showFallbackPreview={false}
        />
        <Text accessibilityRole="alert" style={styles.notice}>
          {systemAlarmMessage(session)} Movement completion is tracked
          separately.
        </Text>
      </>
    );
  }

  const heading =
    challenge.status === 'completed'
      ? 'Movement challenge completed'
      : challenge.status === 'fallback'
        ? 'Fallback recorded'
        : 'Challenge abandoned';
  const outcome =
    challenge.status === 'completed'
      ? `${session.repCount} of ${session.targetReps} jumping jacks were recorded.`
      : challenge.status === 'fallback'
        ? 'This session ended through the non-camera fallback, not five completed jumping jacks.'
        : `This session ended after ${session.repCount} of ${session.targetReps} jumping jacks.`;

  return (
    <Card>
      <Text accessibilityRole="header" style={styles.heading}>
        {heading}
      </Text>
      <Paragraph>{outcome}</Paragraph>
      <Text accessibilityRole="alert" style={styles.notice}>
        {systemAlarmMessage(session)}
        {challenge.status === 'completed' &&
        session.systemAlarm.status !== 'stopped'
          ? ' Movement completion is saved, but a system alarm stop has not been confirmed.'
          : ''}
      </Text>
    </Card>
  );
}

export function ChallengeRouteScreen({
  entry,
  repository,
  onOpenSettings,
}: ChallengeRouteScreenProps) {
  const [loadState, setLoadState] = useState<SessionLoadState>({
    occurrenceId: null,
    status: 'loading',
  });
  const occurrenceId = entry.kind === 'session' ? entry.occurrenceId : null;

  useEffect(() => {
    if (occurrenceId === null) {
      return;
    }
    let current = true;
    void repository
      .getByOccurrence(occurrenceId)
      .then((session) => {
        if (current) {
          setLoadState(
            session === null
              ? { occurrenceId, status: 'missing' }
              : { occurrenceId, status: 'ready', session },
          );
        }
      })
      .catch(() => {
        if (current) {
          setLoadState({ occurrenceId, status: 'failed' });
        }
      });
    return () => {
      current = false;
    };
  }, [occurrenceId, repository]);

  if (entry.kind === 'preview') {
    return (
      <Screen title="Five to feel awake.">
        <Paragraph>
          Challenge preview — camera and movement detection are not connected.
        </Paragraph>
        <ChallengeExperience
          cameraAvailability="not-connected"
          onOpenSettings={onOpenSettings}
        />
      </Screen>
    );
  }

  if (entry.kind === 'invalid') {
    return (
      <Screen title="Challenge link unavailable">
        <Text accessibilityRole="alert" style={styles.error}>
          {entry.message} Open the challenge preview from the alarm list
          instead.
        </Text>
      </Screen>
    );
  }

  const currentLoadState: SessionLoadState =
    loadState.occurrenceId === entry.occurrenceId
      ? loadState
      : { occurrenceId: entry.occurrenceId, status: 'loading' };

  return (
    <Screen title="Five to feel awake.">
      {currentLoadState.status === 'loading' ? (
        <Paragraph>Loading saved wake-up session…</Paragraph>
      ) : null}
      {currentLoadState.status === 'missing' ? (
        <Text accessibilityRole="alert" style={styles.error}>
          This wake-up occurrence was not found. The link did not create a new
          session.
        </Text>
      ) : null}
      {currentLoadState.status === 'failed' ? (
        <Text accessibilityRole="alert" style={styles.error}>
          The saved wake-up session could not be loaded. No session data was
          changed.
        </Text>
      ) : null}
      {currentLoadState.status === 'ready' ? (
        <SessionResult session={currentLoadState.session} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { color: '#12233f', fontSize: 22, fontWeight: '700' },
  notice: { color: '#405274', fontSize: 16, lineHeight: 23 },
  error: { color: '#9a2536', fontSize: 16, lineHeight: 23 },
});
