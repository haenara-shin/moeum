import './global.css';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getDb } from './src/db';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await getDb();
        setReady(true);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  if (error) {
    return (
      <SafeAreaProvider>
        <View className="flex-1 items-center justify-center bg-ink-50 px-8">
          <Text className="text-base font-bold text-red-600">DB 초기화 실패</Text>
          <Text className="mt-2 text-xs text-gray-500">{error}</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  if (!ready) {
    return (
      <SafeAreaProvider>
        <View className="flex-1 items-center justify-center bg-ink-50">
          <Text className="text-3xl font-bold text-ink-900">모음</Text>
          <ActivityIndicator className="mt-6" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <RootNavigator />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
