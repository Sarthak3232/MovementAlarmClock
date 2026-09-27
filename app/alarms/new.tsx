import { Button } from 'react-native';
import { Card, Paragraph, Screen } from '../../src/components/Screen';

export default function NewAlarmScreen() {
  return (
    <Screen title="Your next wake-up.">
      <Card>
        <Paragraph>
          Alarm setup is coming soon. Scheduling needs to be verified on an
          iPhone before you can enable an alarm here.
        </Paragraph>
        <Button title="Save alarm — unavailable" disabled />
        <Paragraph>No alarm has been created or scheduled.</Paragraph>
      </Card>
    </Screen>
  );
}
