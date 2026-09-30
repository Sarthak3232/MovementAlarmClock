import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Button,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Card, Paragraph, Screen } from '../../components/Screen';
import {
  AlarmFormValidationError,
  alarmToFormValues,
  createSavedAlarm,
  updateSavedAlarm,
  type AlarmFormValues,
} from './alarmForm';
import { useAlarmRepository } from './AlarmRepositoryProvider';
import { weekdays, type Alarm, type Weekday } from './model';

const weekdayLabels: Record<Weekday, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
};

const initialValues: AlarmFormValues = {
  label: 'Morning alarm',
  hour: '7',
  minute: '00',
  repeatWeekdays: [1, 2, 3, 4, 5],
};

function createAlarmId() {
  return `alarm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function AlarmEditor({ alarmId }: { alarmId?: string }) {
  const repository = useAlarmRepository();
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [existingAlarm, setExistingAlarm] = useState<Alarm | null>(null);
  const [loading, setLoading] = useState(Boolean(alarmId));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (alarmId === undefined) {
      return;
    }
    let active = true;
    repository
      .get(alarmId)
      .then((alarm) => {
        if (!active) return;
        if (alarm === null) {
          setMessage('This saved alarm could not be found.');
        } else {
          setExistingAlarm(alarm);
          setValues(alarmToFormValues(alarm));
        }
      })
      .catch(() => {
        if (active) setMessage('Saved alarms could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [alarmId, repository]);

  function setField(field: 'label' | 'hour' | 'minute', value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function toggleWeekday(day: Weekday) {
    setValues((current) => ({
      ...current,
      repeatWeekdays: current.repeatWeekdays.includes(day)
        ? current.repeatWeekdays.filter((candidate) => candidate !== day)
        : [...current.repeatWeekdays, day],
    }));
  }

  async function save() {
    setMessage(null);
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const alarm = existingAlarm
        ? updateSavedAlarm(existingAlarm, values, now)
        : createSavedAlarm(values, createAlarmId(), now);
      await repository.save(alarm);
      router.replace('/');
    } catch (error) {
      setMessage(
        error instanceof AlarmFormValidationError
          ? error.message
          : 'The alarm could not be saved. Try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title={alarmId ? 'Edit saved alarm.' : 'Save a wake-up plan.'}>
      <Card>
        <Paragraph>
          This stores your plan on this device. It does not schedule or ring an
          iPhone alarm yet, so keep using your usual alarm.
        </Paragraph>
        {loading ? <Paragraph>Loading saved alarm…</Paragraph> : null}
        {!loading ? (
          <>
            <Text style={styles.label}>Name</Text>
            <TextInput
              accessibilityLabel="Alarm name"
              value={values.label}
              onChangeText={(value) => setField('label', value)}
              maxLength={81}
              style={styles.input}
            />
            <Text style={styles.label}>Local time</Text>
            <View style={styles.timeRow}>
              <TextInput
                accessibilityLabel="Hour, 0 through 23"
                value={values.hour}
                onChangeText={(value) => setField('hour', value)}
                keyboardType="number-pad"
                maxLength={2}
                style={[styles.input, styles.timeInput]}
              />
              <Text style={styles.colon}>:</Text>
              <TextInput
                accessibilityLabel="Minute, 0 through 59"
                value={values.minute}
                onChangeText={(value) => setField('minute', value)}
                keyboardType="number-pad"
                maxLength={2}
                style={[styles.input, styles.timeInput]}
              />
            </View>
            <Text style={styles.label}>Repeat</Text>
            <View style={styles.weekdays}>
              {weekdays.map((day) => {
                const selected = values.repeatWeekdays.includes(day);
                return (
                  <Pressable
                    key={day}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={weekdayLabels[day]}
                    onPress={() => toggleWeekday(day)}
                    style={[styles.day, selected && styles.selectedDay]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        selected && styles.selectedDayText,
                      ]}
                    >
                      {weekdayLabels[day]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {message ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {message}
              </Text>
            ) : null}
            <Button
              title={saving ? 'Saving…' : 'Save alarm'}
              disabled={
                saving || (alarmId !== undefined && existingAlarm === null)
              }
              onPress={save}
            />
            <Paragraph>
              Saved alarms remain off until native scheduling succeeds.
            </Paragraph>
          </>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: '#12233f', fontSize: 16, fontWeight: '600' },
  input: {
    borderColor: '#a9b5c9',
    borderWidth: 1,
    borderRadius: 10,
    color: '#12233f',
    fontSize: 18,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeInput: { width: 76, textAlign: 'center' },
  colon: { color: '#12233f', fontSize: 24, fontWeight: '700' },
  weekdays: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  day: {
    borderColor: '#8e9bb2',
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 44,
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  selectedDay: { backgroundColor: '#163e9e', borderColor: '#163e9e' },
  dayText: { color: '#405274', fontWeight: '600' },
  selectedDayText: { color: '#fff' },
  error: { color: '#9a2536', fontSize: 16, lineHeight: 22 },
});
