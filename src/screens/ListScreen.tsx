import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useQuotesStore } from '../store/quotes';
import { useFoldersStore, type FolderSelector } from '../store/folders';
import { useTtsPlayerStore } from '../store/ttsPlayer';
import type { Quote } from '../types/quote';
import type { Folder } from '../types/folder';
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
  const { items, loading, reload, remove, setSearch, setFolder } = useQuotesStore();
  const {
    folders,
    current: currentFolder,
    reload: reloadFolders,
    setCurrent,
    add: addFolder,
    rename: renameFolder,
    remove: removeFolder,
  } = useFoldersStore();
  const playList = useTtsPlayerStore((s) => s.playList);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Pressable
            onPress={() => {
              if (items.length === 0) return;
              playList(items, 0);
            }}
            accessibilityLabel="전체 재생"
            hitSlop={12}
            disabled={items.length === 0}
            style={({ pressed }) => ({
              opacity: pressed ? 0.5 : items.length === 0 ? 0.3 : 1,
            })}
          >
            <Text style={{ fontSize: 18, color: '#5B4FE5' }}>▶︎</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            accessibilityLabel="설정"
            hitSlop={16}
            style={({ pressed }) => ({
              opacity: pressed ? 0.5 : 1,
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
        </View>
      ),
    });
  }, [navigation, items, playList]);

  useEffect(() => {
    setSearch(debouncedSearch);
  }, [debouncedSearch, setSearch]);

  // currentFolder 변경 시 quotesStore의 folderId 동기화
  useEffect(() => {
    setFolder(currentFolder);
  }, [currentFolder, setFolder]);

  useFocusEffect(
    useCallback(() => {
      void reload();
      void reloadFolders();
    }, [reload, reloadFolders]),
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

  const onAddFolder = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        '새 폴더',
        '폴더 이름을 입력해주세요',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '만들기',
            onPress: async (name?: string) => {
              const trimmed = name?.trim();
              if (!trimmed) return;
              const id = await addFolder({ name: trimmed });
              setCurrent(id);
            },
          },
        ],
        'plain-text',
      );
    } else {
      // Android는 prompt 미지원 — Phase 1.5에 별도 모달
      Alert.alert('Android는 다음 버전에서 지원됩니다');
    }
  };

  const onLongPressFolder = (folder: Folder) => {
    if (Platform.OS !== 'ios' || folder.id == null) return;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: folder.name,
        options: ['취소', '이름 변경', '폴더 삭제'],
        destructiveButtonIndex: 2,
        cancelButtonIndex: 0,
      },
      (idx) => {
        if (idx === 1) {
          Alert.prompt(
            '폴더 이름 변경',
            undefined,
            [
              { text: '취소', style: 'cancel' },
              {
                text: '저장',
                onPress: async (name?: string) => {
                  const trimmed = name?.trim();
                  if (!trimmed || folder.id == null) return;
                  await renameFolder(folder.id, trimmed);
                },
              },
            ],
            'plain-text',
            folder.name,
          );
        } else if (idx === 2) {
          Alert.alert(
            '폴더 삭제',
            `'${folder.name}' 폴더를 삭제할까요? 안에 있던 문장은 미분류로 이동합니다.`,
            [
              { text: '취소', style: 'cancel' },
              {
                text: '삭제',
                style: 'destructive',
                onPress: () => {
                  if (folder.id != null) void removeFolder(folder.id);
                },
              },
            ],
          );
        }
      },
    );
  };

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
        <Text className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">
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
          placeholder="문장 검색"
          placeholderTextColor="#999"
          className="rounded-xl bg-white px-4 py-3 text-base text-ink-900 dark:bg-neutral-800 dark:text-white"
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      {/* 폴더 칩 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 4 }}
        className="max-h-12 grow-0"
      >
        <FolderChip
          label="전체"
          active={currentFolder === 'all'}
          onPress={() => setCurrent('all')}
        />
        <FolderChip
          label="미분류"
          active={currentFolder === null}
          onPress={() => setCurrent(null)}
        />
        {folders.map((f) => (
          <FolderChip
            key={f.id}
            label={f.name}
            active={currentFolder === f.id}
            onPress={() => f.id != null && setCurrent(f.id)}
            onLongPress={() => onLongPressFolder(f)}
          />
        ))}
        <FolderChip label="+ 새 폴더" active={false} onPress={onAddFolder} variant="add" />
      </ScrollView>

      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 8, flexGrow: 1, paddingBottom: 120 }}
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

function FolderChip({
  label,
  active,
  onPress,
  onLongPress,
  variant,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  variant?: 'add';
}) {
  const isAdd = variant === 'add';
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      className={`mr-2 rounded-full px-4 py-2 ${
        active
          ? 'bg-accent-500'
          : isAdd
            ? 'border border-dashed border-gray-300 dark:border-neutral-700'
            : 'bg-white dark:bg-neutral-800'
      }`}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Text
        className={`text-xs font-medium ${
          active
            ? 'text-white'
            : isAdd
              ? 'text-gray-500 dark:text-gray-400'
              : 'text-ink-900 dark:text-white'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
