import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useQuotesStore } from '../store/quotes';
import type { Quote } from '../types/quote';
import { formatDate, truncate } from '../lib/format';

type Nav = NativeStackNavigationProp<RootStackParamList, 'List'>;

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function ListScreen() {
  const navigation = useNavigation<Nav>();
  const { items, loading, reload, remove, setSearch } = useQuotesStore();
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => navigation.navigate('Settings')}
          accessibilityLabel="설정"
          hitSlop={16}
          style={({ pressed }) => ({
            opacity: pressed ? 0.5 : 1,
            paddingHorizontal: 8,
            paddingVertical: 4,
          })}
        >
          <Text
            style={{
              fontSize: 16,
              fontFamily: 'Pretendard-Bold',
              color: '#5B4FE5',
            }}
          >
            설정
          </Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    setSearch(debouncedSearch);
  }, [debouncedSearch, setSearch]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const onDelete = useCallback(
    (q: Quote) => {
      Alert.alert('삭제할까요?', truncate(q.body, 60), [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            if (q.id != null) void remove(q.id);
          },
        },
      ]);
    },
    [remove],
  );

  const renderItem = useCallback(
    ({ item }: { item: Quote }) => (
      <Pressable
        onPress={() => item.id != null && navigation.navigate('Detail', { id: item.id })}
        onLongPress={() => onDelete(item)}
        className="mx-4 my-2 rounded-2xl bg-white p-4 shadow-sm dark:bg-neutral-800"
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Text className="text-base leading-6 text-ink-900 dark:text-white" numberOfLines={3}>
          {item.body}
        </Text>
        {(item.author || item.source) && (
          <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400" numberOfLines={1}>
            {[item.author, item.source].filter(Boolean).join(' · ')}
          </Text>
        )}
        <Text className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
          {item.created_at ? formatDate(item.created_at) : ''}
        </Text>
      </Pressable>
    ),
    [navigation, onDelete],
  );

  const empty = useMemo(
    () => (
      <View className="flex-1 items-center justify-center px-8 py-24">
        <Text className="text-4xl">📜</Text>
        <Text className="mt-4 text-lg font-bold text-ink-900 dark:text-white">
          첫 문장을 모아보세요
        </Text>
        <Text className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
          우측 하단의 +를 눌러 메모하거나 사진에서 추출해보세요
        </Text>
      </View>
    ),
    [],
  );

  return (
    <View className="flex-1 bg-ink-50 dark:bg-neutral-900">
      <View className="px-4 py-2">
        <TextInput
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="문장·저자 검색"
          placeholderTextColor="#999"
          className="rounded-xl bg-white px-4 py-3 text-base text-ink-900 dark:bg-neutral-800 dark:text-white"
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 8, flexGrow: 1 }}
        ListEmptyComponent={loading ? null : empty}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
      />

      {loading && items.length === 0 && (
        <View className="absolute inset-0 items-center justify-center">
          <ActivityIndicator />
        </View>
      )}

      <Pressable
        onPress={() => navigation.navigate('New')}
        accessibilityLabel="새 문장 추가"
        className="absolute bottom-8 right-6 h-14 w-14 items-center justify-center rounded-full bg-accent-500 shadow-lg"
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      >
        <Text className="text-3xl font-light text-white">+</Text>
      </Pressable>
    </View>
  );
}
