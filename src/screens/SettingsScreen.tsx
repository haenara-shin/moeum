import { Pressable, ScrollView, Text, View } from 'react-native';
import { useThemeStore, type ThemePreference } from '../store/theme';
import { countQuotes } from '../db';
import { useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

const OPTIONS: { value: ThemePreference; label: string; hint: string }[] = [
  { value: 'system', label: '시스템 기본', hint: 'iOS 설정의 다크모드 따름' },
  { value: 'light', label: '라이트', hint: '항상 밝은 테마' },
  { value: 'dark', label: '다크', hint: '항상 어두운 테마' },
];

export function SettingsScreen() {
  const { preference, setPreference } = useThemeStore();
  const [count, setCount] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      void countQuotes().then(setCount);
    }, []),
  );

  return (
    <ScrollView className="flex-1 bg-ink-50 dark:bg-neutral-900">
      <View className="px-4 py-6">
        <Text className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          모양
        </Text>
        <View className="overflow-hidden rounded-2xl bg-white dark:bg-neutral-800">
          {OPTIONS.map((opt, i) => {
            const selected = preference === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setPreference(opt.value)}
                className={`flex-row items-center px-4 py-4 ${
                  i > 0 ? 'border-t border-gray-100 dark:border-neutral-700' : ''
                }`}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <View className="flex-1">
                  <Text className="text-base text-ink-900 dark:text-white">{opt.label}</Text>
                  <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{opt.hint}</Text>
                </View>
                {selected && (
                  <Text className="text-accent-500 text-base" accessibilityLabel="선택됨">
                    ✓
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>

        <Text className="mb-3 mt-8 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          내 데이터
        </Text>
        <View className="overflow-hidden rounded-2xl bg-white dark:bg-neutral-800">
          <View className="flex-row items-center px-4 py-4">
            <Text className="flex-1 text-base text-ink-900 dark:text-white">저장된 문장</Text>
            <Text className="text-base text-gray-500 dark:text-gray-400">
              {count == null ? '…' : `${count}개`}
            </Text>
          </View>
        </View>

        <Text className="mb-3 mt-8 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          정보
        </Text>
        <View className="overflow-hidden rounded-2xl bg-white dark:bg-neutral-800">
          <View className="flex-row items-center px-4 py-4">
            <Text className="flex-1 text-base text-ink-900 dark:text-white">버전</Text>
            <Text className="text-base text-gray-500 dark:text-gray-400">0.1.0</Text>
          </View>
          <View className="flex-row items-center border-t border-gray-100 px-4 py-4 dark:border-neutral-700">
            <Text className="flex-1 text-base text-ink-900 dark:text-white">시리즈</Text>
            <Text className="text-base text-gray-500 dark:text-gray-400">
              모임 · 모가 · 모여 · 모음
            </Text>
          </View>
        </View>

        <Text className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500">
          좋은 문장을 모으다
        </Text>
      </View>
    </ScrollView>
  );
}
