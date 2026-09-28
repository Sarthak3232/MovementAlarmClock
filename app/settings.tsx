import { Card, Paragraph, Screen } from '../src/components/Screen';

export default function SettingsScreen() {
  return (
    <Screen title="A clearer morning.">
      <Card>
        <Paragraph>Movement goal: five jumping jacks.</Paragraph>
        <Paragraph>
          Camera access is not requested in this preview. Future movement
          detection will process frames on your device without uploading video.
        </Paragraph>
        <Paragraph>
          iPhone alarms include system stop controls. Stopping a system alarm
          will not count as completing your movement challenge.
        </Paragraph>
      </Card>
      <Paragraph>
        Alarm permissions, camera permissions, and recovery options will appear
        when those features are ready.
      </Paragraph>
    </Screen>
  );
}
