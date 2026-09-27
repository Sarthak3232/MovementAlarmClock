import { StyleSheet, Text } from 'react-native';
import { Card, Paragraph, Screen } from '../src/components/Screen';

export default function ChallengeScreen() {
  return (
    <Screen title="Five to feel awake.">
      <Paragraph>
        Challenge preview — camera and movement detection are not connected.
      </Paragraph>
      <Card>
        <Text
          style={styles.progress}
          accessibilityLabel="0 of 5 jumping jacks. Preview only."
        >
          0 / 5
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
      <Paragraph>
        Stopping an iPhone system alarm is separate from finishing this
        challenge. You will always have a fallback if movement or camera access
        is unavailable.
      </Paragraph>
    </Screen>
  );
}
const styles = StyleSheet.create({
  progress: {
    color: '#163e9e',
    fontSize: 64,
    fontWeight: '700',
    textAlign: 'center',
  },
});
