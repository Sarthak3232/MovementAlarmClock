import { useLocalSearchParams } from 'expo-router';

import { AlarmEditor } from '../../src/features/alarms';

export default function EditAlarmScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const alarmId = Array.isArray(id) ? id[0] : id;
  return <AlarmEditor alarmId={alarmId} />;
}
