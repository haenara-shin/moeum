import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { useThemeStore, resolveScheme } from '../store/theme';
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
  const systemScheme = useColorScheme();
  const themePref = useThemeStore((s) => s.preference);
  const scheme = resolveScheme(themePref, systemScheme);
  const placeholderColor = scheme === 'dark' ? '#666' : '#9CA3AF';

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
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
      ),
    });
  }, [navigation]);

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
        className="mx-4 my-2 rounded-2xl bg-white p-4 shadow-sm dark:border dark:border-neutral-700/50 dark:bg-neutral-800 dark:shadow-none"
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

  const empty = useMemo(() => {
    // 1) 검색 중 0건
    if (debouncedSearch) {
      return (
        <View className="flex-1 items-center justify-center px-8 py-24">
          <Text className="text-5xl">🔍</Text>
          <Text className="mt-5 text-lg font-bold text-ink-900 dark:text-white">
            검색 결과가 없어요
          </Text>
          <Text
            className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400"
            numberOfLines={2}
          >
            ‘{debouncedSearch}’와(과) 일치하는 문장을 찾지 못했어요
          </Text>
          <Pressable
            onPress={() => {
              setSearchInput('');
              Keyboard.dismiss();
            }}
            className="mt-6 rounded-full bg-white px-5 py-2 dark:bg-neutral-800"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Text className="text-sm font-bold text-accent-500">검색어 지우기</Text>
          </Pressable>
        </View>
      );
    }

    // 2) 특정 폴더 필터 중 0건
    if (currentFolder !== 'all') {
      const label =
        currentFolder === null
          ? '미분류'
          : folders.find((f) => f.id === currentFolder)?.name ?? '';
      return (
        <View className="flex-1 items-center justify-center px-8 py-24">
          <Text className="text-5xl">📁</Text>
          <Text className="mt-5 text-lg font-bold text-ink-900 dark:text-white">
            ‘{label}’에 문장이 없어요
          </Text>
          <Text className="mt-2 text-center text-sm leading-5 text-gray-500 dark:text-gray-400">
            + 버튼으로 새 문장을 추가하거나{'\n'}상세 화면에서 이 폴더로 옮길 수 있어요
          </Text>
        </View>
      );
    }

    // 3) 전체 첫 진입
    return (
      <View className="flex-1 items-center justify-center px-8 py-20">
        <Text className="text-6xl">📜</Text>
        <Text className="mt-6 text-xl font-bold text-ink-900 dark:text-white">
          첫 문장을 모아볼까요?
        </Text>
        <Text className="mt-3 text-center text-sm leading-6 text-gray-500 dark:text-gray-400">
          책·신문·기사에서 발견한 좋은 문장을{'\n'}
          사진으로 자동 추출하거나 직접 적어보세요
        </Text>
        <View className="mt-10 flex-row items-center">
          <Text className="text-xs text-gray-400 dark:text-gray-500">
            우측 하단 + 버튼으로 시작
          </Text>
          <Text className="ml-1 text-base text-gray-400 dark:text-gray-500">↘</Text>
        </View>
      </View>
    );
  }, [debouncedSearch, currentFolder, folders]);

  return (
    <View className="flex-1 bg-ink-50 dark:bg-neutral-900">
      <View className="px-4 py-2">
        <View className="flex-row items-center rounded-xl bg-white px-4 dark:bg-neutral-800">
          <Text className="mr-2 text-sm" style={{ color: placeholderColor }}>
            🔍
          </Text>
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="문장 검색"
            placeholderTextColor={placeholderColor}
            className="flex-1 py-3 text-base text-ink-900 dark:text-white"
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchInput.length > 0 && (
            <Pressable
              onPress={() => {
                setSearchInput('');
                Keyboard.dismiss();
              }}
              hitSlop={10}
              accessibilityLabel="검색어 지우기"
            >
              <Text style={{ color: placeholderColor, fontSize: 16 }}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* 폴더 칩 + 현재 목록 연속 재생 */}
      <View className="flex-row items-center">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 4 }}
          className="max-h-12 flex-1"
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

        <Pressable
          onPress={() => {
            if (items.length === 0) return;
            playList(items, 0);
          }}
          disabled={items.length === 0}
          accessibilityLabel="현재 목록 전체 재생"
          hitSlop={10}
          className="mr-3 ml-1 h-9 w-9 items-center justify-center rounded-full bg-white dark:border dark:border-neutral-700/50 dark:bg-neutral-800"
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : items.length === 0 ? 0.35 : 1,
          })}
        >
          <Text style={{ fontSize: 14, color: '#5B4FE5' }}>▶︎</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 8, flexGrow: 1, paddingBottom: 120 }}
        ListEmptyComponent={loading ? null : empty}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
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
