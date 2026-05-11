import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { getQuote } from '../db';
import { useQuotesStore } from '../store/quotes';
import type { Quote } from '../types/quote';
import { formatDate } from '../lib/format';

type Route = NativeStackScreenProps<RootStackParamList, 'Detail'>['route'];
type Nav = NativeStackNavigationProp<RootStackParamList, 'Detail'>;

export function DetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const remove = useQuotesStore((s) => s.remove);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);

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
    }, [load]),
  );

  const onDelete = () => {
    if (!quote?.id) return;
    Alert.alert('이 문장을 삭제할까요?', undefined, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await remove(quote.id!);
          navigation.goBack();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-ink-50">
        <ActivityIndicator />
      </View>
    );
  }

  if (!quote) {
    return (
      <View className="flex-1 items-center justify-center bg-ink-50 px-8">
        <Text className="text-base text-gray-500">문장을 찾을 수 없습니다</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-ink-50">
      <View className="p-6">
        <Text className="text-xl leading-9 text-ink-900">{quote.body}</Text>

        {(quote.author || quote.source) && (
          <View className="mt-6 border-t border-gray-200 pt-4">
            {quote.author && (
              <Text className="text-sm text-gray-700">— {quote.author}</Text>
            )}
            {quote.source && (
              <Text className="mt-1 text-xs text-gray-500">{quote.source}</Text>
            )}
          </View>
        )}

        <Text className="mt-6 text-[11px] text-gray-400">
          저장: {quote.created_at ? formatDate(quote.created_at) : '-'}
          {quote.updated_at && quote.updated_at !== quote.created_at
            ? ` · 수정: ${formatDate(quote.updated_at)}`
            : ''}
        </Text>

        <View className="mt-10 flex-row gap-3">
          <Pressable
            onPress={() => navigation.navigate('Edit', { id: quote.id! })}
            className="flex-1 items-center rounded-2xl bg-accent-500 py-3"
          >
            <Text className="text-sm font-bold text-white">편집</Text>
          </Pressable>
          <Pressable
            onPress={onDelete}
            className="flex-1 items-center rounded-2xl bg-red-50 py-3"
          >
            <Text className="text-sm font-bold text-red-600">삭제</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
