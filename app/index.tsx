import { Text, StyleSheet } from 'react-native';
import { Card, Paragraph, Screen } from '../src/components/Screen';
import { RouteLink } from '../src/components/RouteLink';

export default function AlarmsScreen() {
  return (
    <Screen title="Start your day moving.">
      <Paragraph>Five jumping jacks. One fresh start.</Paragraph>
      <Card>
        <Text accessibilityRole="header" style={styles.heading}>
          No alarms yet
        </Text>
        <Paragraph>
          This preview does not schedule or ring alarms yet. Keep using your
          usual alarm.
        </Paragraph>
        <RouteLink href="/alarms/new">Explore alarm setup</RouteLink>
      </Card>
      <RouteLink href="/challenge">Preview the wake-up challenge</RouteLink>
      <RouteLink href="/settings">Settings and privacy</RouteLink>
    </Screen>
  );
}
const styles = StyleSheet.create({
  heading: { fontSize: 22, fontWeight: '600', color: '#12233f' },
});
