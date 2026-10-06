import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AlarmRepositoryProvider } from '../src/features/alarms';
import { WakeUpSessionRepositoryProvider } from '../src/features/challenge/WakeUpSessionRepositoryProvider';

export default function RootLayout() {
  return (
    <AlarmRepositoryProvider>
      <WakeUpSessionRepositoryProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerTintColor: '#12233f',
            contentStyle: { backgroundColor: '#f5f7fb' },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'Alarms' }} />
          <Stack.Screen name="alarms/new" options={{ title: 'New alarm' }} />
          <Stack.Screen name="alarms/[id]" options={{ title: 'Edit alarm' }} />
          <Stack.Screen
            name="challenge"
            options={{ title: 'Wake-up challenge' }}
          />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        </Stack>
      </WakeUpSessionRepositoryProvider>
    </AlarmRepositoryProvider>
  );
}
