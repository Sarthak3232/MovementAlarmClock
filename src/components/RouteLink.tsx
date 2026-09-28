import { Link, type Href } from 'expo-router';
import { StyleSheet } from 'react-native';

export function RouteLink({
  href,
  children,
}: {
  href: Href;
  children: string;
}) {
  return (
    <Link href={href} style={styles.link}>
      {children}
    </Link>
  );
}

const styles = StyleSheet.create({
  link: {
    backgroundColor: '#163e9e',
    color: '#fff',
    padding: 16,
    borderRadius: 12,
    overflow: 'hidden',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    minHeight: 48,
  },
});
