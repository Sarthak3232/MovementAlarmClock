import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Button, Text, StyleSheet } from 'react-native';
import { Card, Paragraph, Screen } from '../src/components/Screen';
import { RouteLink } from '../src/components/RouteLink';
import {
  formatAlarmTime,
  formatRepeatWeekdays,
  useAlarmRepository,
  type Alarm,
} from '../src/features/alarms';

export default function AlarmsScreen() {
  const repository = useAlarmRepository();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAlarms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAlarms(await repository.list());
    } catch {
      setError('Saved alarms could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useFocusEffect(
    useCallback(() => {
      void loadAlarms();
    }, [loadAlarms]),
  );

  async function deleteAlarm(alarm: Alarm) {
    try {
      await repository.delete(alarm.id);
      await loadAlarms();
    } catch {
      setError(`${alarm.label} could not be deleted.`);
    }
  }

  return (
    <Screen title="Start your day moving.">
      <Paragraph>Five jumping jacks. One fresh start.</Paragraph>
      {loading ? <Paragraph>Loading saved alarms…</Paragraph> : null}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {!loading && alarms.length === 0 ? (
        <Card>
          <Text accessibilityRole="header" style={styles.heading}>
            No alarms yet
          </Text>
          <Paragraph>
            You can save a wake-up plan locally, but this app does not schedule
            or ring alarms yet. Keep using your usual alarm.
          </Paragraph>
        </Card>
      ) : null}
      {alarms.map((alarm) => (
        <Card key={alarm.id}>
          <Text accessibilityRole="header" style={styles.heading}>
            {alarm.label}
          </Text>
          <Text style={styles.time}>{formatAlarmTime(alarm)}</Text>
          <Paragraph>{formatRepeatWeekdays(alarm.repeatWeekdays)}</Paragraph>
          <Text style={styles.status}>Saved only — not scheduled</Text>
          <RouteLink href={`/alarms/${alarm.id}`}>
            {`Edit ${alarm.label}`}
          </RouteLink>
          <Button
            title={`Delete ${alarm.label}`}
            color="#9a2536"
            onPress={() => void deleteAlarm(alarm)}
          />
        </Card>
      ))}
      <RouteLink href="/alarms/new">Add a saved alarm</RouteLink>
      <RouteLink href="/challenge">Preview the wake-up challenge</RouteLink>
      <RouteLink href="/settings">Settings and privacy</RouteLink>
    </Screen>
  );
}
const styles = StyleSheet.create({
  heading: { fontSize: 22, fontWeight: '600', color: '#12233f' },
  time: { color: '#12233f', fontSize: 36, fontWeight: '700' },
  status: { color: '#9a5b16', fontSize: 16, fontWeight: '600' },
  error: { color: '#9a2536', fontSize: 16, lineHeight: 22 },
});
