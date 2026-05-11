import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { getDb, countQuotes } from './src/db';

export default function App() {
  const [ready, setReady] = useState(false);
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await getDb();
        setCount(await countQuotes());
        setReady(true);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>모음</Text>
        <Text style={styles.subtitle}>좋은 문장을 모으다</Text>
        {!ready && !error && <ActivityIndicator />}
        {error && <Text style={styles.error}>DB 오류: {error}</Text>}
        {ready && <Text style={styles.count}>저장된 문장: {count}개</Text>}
        <Text style={styles.phase}>Phase 1 · W1 (Expo SDK 55)</Text>
        <StatusBar style="auto" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF7',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  title: { fontSize: 48, fontWeight: '700', color: '#111' },
  subtitle: { fontSize: 16, color: '#666' },
  count: { fontSize: 14, color: '#333', marginTop: 16 },
  phase: { fontSize: 12, color: '#999', position: 'absolute', bottom: 24 },
  error: { color: '#c00', fontSize: 12, padding: 12 },
});
