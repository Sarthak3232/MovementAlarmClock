import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function Screen({
  title,
  children,
}: PropsWithChildren<{ title: string }>) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>MOVEMENT ALARM CLOCK</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

export function Paragraph({ children }: PropsWithChildren) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7fb' },
  content: {
    padding: 24,
    gap: 20,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  eyebrow: {
    color: '#405274',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  title: { color: '#12233f', fontSize: 34, fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, gap: 16 },
  paragraph: { color: '#405274', fontSize: 17, lineHeight: 26 },
});
