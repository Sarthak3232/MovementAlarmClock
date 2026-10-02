import { Linking } from 'react-native';
import { Paragraph, Screen } from '../src/components/Screen';
import { ChallengeExperience } from '../src/features/challenge';

export default function ChallengeScreen() {
  return (
    <Screen title="Five to feel awake.">
      <Paragraph>
        Challenge preview — camera and movement detection are not connected.
      </Paragraph>
      <ChallengeExperience
        cameraAvailability="not-connected"
        onOpenSettings={() => void Linking.openSettings()}
      />
    </Screen>
  );
}
