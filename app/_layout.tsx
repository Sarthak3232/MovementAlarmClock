import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: '#12233f',
          contentStyle: { backgroundColor: '#f5f7fb' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Alarms' }} />
        <Stack.Screen name="alarms/new" options={{ title: 'New alarm' }} />
        <Stack.Screen
          name="challenge"
          options={{ title: 'Wake-up challenge' }}
        />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </>
  );
}
