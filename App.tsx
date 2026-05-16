import './global.css';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { getDb } from './src/db';
import { RootNavigator } from './src/navigation/RootNavigator';

// 모든 Text / TextInput 기본 폰트 = Pretendard-Regular
// fontWeight: 'bold'인 경우 Pretendard-Bold 자동 매핑은 RN이 처리하지 못하므로
// 두꺼운 글자에는 직접 fontFamily: 'Pretendard-Bold' 적용 필요.
const TextAny = Text as unknown as { defaultProps?: { style?: unknown } };
const InputAny = TextInput as unknown as { defaultProps?: { style?: unknown } };
TextAny.defaultProps = TextAny.defaultProps || {};
TextAny.defaultProps.style = { fontFamily: 'Pretendard-Regular' };
InputAny.defaultProps = InputAny.defaultProps || {};
InputAny.defaultProps.style = { fontFamily: 'Pretendard-Regular' };

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fontsLoaded] = useFonts({
    'Pretendard-Regular': require('./assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Bold': require('./assets/fonts/Pretendard-Bold.otf'),
  });

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

  const allReady = ready && fontsLoaded;

  if (error) {
    return (
      <SafeAreaProvider>
        <View className="flex-1 items-center justify-center bg-ink-50 px-8 dark:bg-neutral-900">
          <Text className="text-base font-bold text-red-600 dark:text-red-400">
            DB 초기화 실패
          </Text>
          <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">{error}</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  if (!allReady) {
    return (
      <SafeAreaProvider>
        <View className="flex-1 items-center justify-center bg-ink-50 dark:bg-neutral-900">
          <Text className="text-3xl font-bold text-ink-900 dark:text-white">모음</Text>
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
