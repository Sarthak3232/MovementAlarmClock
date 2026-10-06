import { useLocalSearchParams } from 'expo-router';
import { Linking } from 'react-native';
import {
  ChallengeRouteScreen,
  parseChallengeRouteEntry,
} from '../src/features/challenge';
import { useWakeUpSessionRepository } from '../src/features/challenge/WakeUpSessionRepositoryProvider';

export default function ChallengeScreen() {
  const params = useLocalSearchParams();
  const repository = useWakeUpSessionRepository();
  const entry = parseChallengeRouteEntry({
    occurrenceId: params.occurrenceId,
  });

  return (
    <ChallengeRouteScreen
      entry={entry}
      repository={repository}
      onOpenSettings={() => void Linking.openSettings()}
    />
  );
}
