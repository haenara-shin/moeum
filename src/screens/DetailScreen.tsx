import { useCallback, useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import * as Speech from 'expo-speech';
import type { RootStackParamList } from '../navigation/types';
import { getQuote } from '../db';
import { useQuotesStore } from '../store/quotes';
import { useFoldersStore } from '../store/folders';
import type { Quote } from '../types/quote';
import { formatDate } from '../lib/format';

type Route = NativeStackScreenProps<RootStackParamList, 'Detail'>['route'];
type Nav = NativeStackNavigationProp<RootStackParamList, 'Detail'>;

export function DetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const remove = useQuotesStore((s) => s.remove);
  const move = useQuotesStore((s) => s.move);
  const folders = useFoldersStore((s) => s.folders);
  const reloadFolders = useFoldersStore((s) => s.reload);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [speaking, setSpeaking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = await getQuote(route.params.id);
      setQuote(q);
    } finally {
      setLoading(false);
    }
  }, [route.params.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
      void reloadFolders();
      return () => {
        void Speech.stop();
        setSpeaking(false);
      };
    }, [load, reloadFolders]),
  );

  useEffect(() => {
    return () => {
      void Speech.stop();
    };
  }, []);

  const onDelete = () => {
    if (!quote?.id) return;
    Alert.alert('이 문장을 삭제할까요?', undefined, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await Speech.stop();
          await remove(quote.id!);
          navigation.goBack();
        },
      },
    ]);
  };

  const onSpeak = async () => {
    if (!quote) return;
    if (speaking) {
      await Speech.stop();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    Speech.speak(quote.body, {
      language: 'ko-KR',
      pitch: 1.0,
      rate: 1.0,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  const onShare = async () => {
    if (!quote) return;
    try {
      await Share.share({
        message: quote.body,
      });
    } catch (e) {
      // user cancelled
    }
  };

  const onMoveFolder = () => {
    if (!quote?.id || Platform.OS !== 'ios') return;
    const options = ['취소', '미분류로 이동', ...folders.map((f) => f.name)];
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: '폴더로 이동',
        options,
        cancelButtonIndex: 0,
      },
      async (idx) => {
        if (idx === 0) return;
        const target: number | null = idx === 1 ? null : folders[idx - 2]?.id ?? null;
        if (quote.id != null) {
          await move(quote.id, target);
          // 화면 표시 갱신
          const fresh = await getQuote(quote.id);
          setQuote(fresh);
        }
      },
    );
  };

  const folderName = (() => {
    if (!quote) return null;
    if (quote.folder_id == null) return '미분류';
    return folders.find((f) => f.id === quote.folder_id)?.name ?? '미분류';
  })();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-ink-50 dark:bg-neutral-900">
        <ActivityIndicator />
      </View>
    );
  }

  if (!quote) {
    return (
      <View className="flex-1 items-center justify-center bg-ink-50 px-8 dark:bg-neutral-900">
        <Text className="text-base text-gray-500 dark:text-gray-400">
          문장을 찾을 수 없습니다
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-ink-50 dark:bg-neutral-900">
      <View className="p-6">
        <Text className="text-xl leading-9 text-ink-900 dark:text-white">{quote.body}</Text>

        <Text className="mt-6 text-[11px] text-gray-400 dark:text-gray-500">
          저장: {quote.created_at ? formatDate(quote.created_at) : '-'}
          {quote.updated_at && quote.updated_at !== quote.created_at
            ? ` · 수정: ${formatDate(quote.updated_at)}`
            : ''}
        </Text>

        {/* 폴더 표시/이동 */}
        <Pressable
          onPress={onMoveFolder}
          className="mt-4 flex-row items-center self-start rounded-full bg-white px-3 py-1.5 dark:bg-neutral-800"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Text className="mr-1 text-xs text-gray-500 dark:text-gray-400">📁</Text>
          <Text className="text-xs font-medium text-ink-900 dark:text-white">{folderName}</Text>
          <Text className="ml-1 text-[10px] text-gray-400 dark:text-gray-500">변경 ›</Text>
        </Pressable>

        {/* 재생 + 공유 */}
        <View className="mt-8 flex-row gap-3">
          <Pressable
            onPress={onSpeak}
            className="flex-1 flex-row items-center justify-center rounded-2xl bg-white py-3 dark:bg-neutral-800"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Text className="text-lg">{speaking ? '⏸' : '▶︎'}</Text>
            <Text className="ml-2 text-sm font-bold text-ink-900 dark:text-white">
              {speaking ? '멈추기' : '읽기'}
            </Text>
          </Pressable>
          <Pressable
            onPress={onShare}
            className="flex-1 flex-row items-center justify-center rounded-2xl bg-white py-3 dark:bg-neutral-800"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Text className="text-lg">↗︎</Text>
            <Text className="ml-2 text-sm font-bold text-ink-900 dark:text-white">공유</Text>
          </Pressable>
        </View>

        {/* 편집 + 삭제 */}
        <View className="mt-3 flex-row gap-3">
          <Pressable
            onPress={() => navigation.navigate('Edit', { id: quote.id! })}
            className="flex-1 items-center rounded-2xl bg-accent-500 py-3"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Text className="text-sm font-bold text-white">편집</Text>
          </Pressable>
          <Pressable
            onPress={onDelete}
            className="flex-1 items-center rounded-2xl bg-red-50 py-3 dark:bg-red-950"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Text className="text-sm font-bold text-red-600 dark:text-red-300">삭제</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
