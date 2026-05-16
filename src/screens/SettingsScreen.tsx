import { useCallback, useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { useThemeStore, type ThemePreference } from '../store/theme';
import { useNotificationStore } from '../store/notification';
import { useFoldersStore } from '../store/folders';
import { getPermissionStatus } from '../lib/notifications';
import { countQuotes } from '../db';
import { exportAndShare, pickAndImport } from '../lib/backup';

const THEME_OPTIONS: { value: ThemePreference; label: string; hint: string }[] = [
  { value: 'system', label: '시스템 기본', hint: 'iOS 설정의 다크모드 따름' },
  { value: 'light', label: '라이트', hint: '항상 밝은 테마' },
  { value: 'dark', label: '다크', hint: '항상 어두운 테마' },
];

function formatTime(hour: number, minute: number): string {
  const period = hour < 12 ? '오전' : '오후';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${period} ${h12}:${String(minute).padStart(2, '0')}`;
}

export function SettingsScreen() {
  const { preference, setPreference } = useThemeStore();
  const { enabled, hour, minute, setEnabled, setTime } = useNotificationStore();
  const folders = useFoldersStore((s) => s.folders);
  const reloadFolders = useFoldersStore((s) => s.reload);
  const [count, setCount] = useState<number | null>(null);
  const [permStatus, setPermStatus] = useState<string>('undetermined');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void countQuotes('all').then(setCount);
      void getPermissionStatus().then(setPermStatus);
      void reloadFolders();
    }, [reloadFolders]),
  );

  const onExportAll = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await exportAndShare('all', '전체');
    } catch (e) {
      Alert.alert('내보내기 실패', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onExportByFolder = () => {
    if (Platform.OS !== 'ios') return;
    const options = ['취소', '전체', '미분류', ...folders.map((f) => f.name)];
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: '내보낼 범위',
        options,
        cancelButtonIndex: 0,
      },
      async (idx) => {
        if (idx === 0 || busy) return;
        setBusy(true);
        try {
          if (idx === 1) {
            await exportAndShare('all', '전체');
          } else if (idx === 2) {
            await exportAndShare(null, '미분류');
          } else {
            const folder = folders[idx - 3];
            if (folder?.id != null) {
              await exportAndShare(folder.id, folder.name);
            }
          }
        } catch (e) {
          Alert.alert('내보내기 실패', (e as Error).message);
        } finally {
          setBusy(false);
        }
      },
    );
  };

  const onImport = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const summary = await pickAndImport();
      if (summary.newQuotes === 0 && summary.newFolders === 0 && summary.duplicates === 0) {
        // 사용자가 취소
        return;
      }
      const lines = [
        `새 문장: ${summary.newQuotes}개`,
        summary.newFolders > 0 ? `새 폴더: ${summary.newFolders}개` : '',
        summary.duplicates > 0 ? `이미 있는 문장: ${summary.duplicates}개 건너뜀` : '',
      ].filter(Boolean);
      Alert.alert('가져오기 완료', lines.join('\n'));
      void countQuotes('all').then(setCount);
    } catch (e) {
      Alert.alert('가져오기 실패', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onToggleNotification = async (next: boolean) => {
    const ok = await setEnabled(next);
    if (!ok && next) {
      Alert.alert(
        '알림 권한이 필요합니다',
        '설정 앱에서 모음 알림을 허용해주세요.',
        [
          { text: '취소', style: 'cancel' },
          { text: '설정 열기', onPress: () => Linking.openSettings() },
        ],
      );
    }
    setPermStatus(await getPermissionStatus());
  };

  const onTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (event.type === 'set' && date) {
      void setTime(date.getHours(), date.getMinutes());
    }
  };

  const tempDate = new Date();
  tempDate.setHours(hour, minute, 0, 0);

  return (
    <ScrollView className="flex-1 bg-ink-50 dark:bg-neutral-900">
      <View className="px-4 py-6">
        {/* 모양 */}
        <Text className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          모양
        </Text>
        <View className="overflow-hidden rounded-2xl bg-white dark:bg-neutral-800">
          {THEME_OPTIONS.map((opt, i) => {
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

        {/* 알림 */}
        <Text className="mb-3 mt-8 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          매일 알림
        </Text>
        <View className="overflow-hidden rounded-2xl bg-white dark:bg-neutral-800">
          <View className="flex-row items-center px-4 py-4">
            <View className="flex-1">
              <Text className="text-base text-ink-900 dark:text-white">매일 알림</Text>
              <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                저장한 문장을 다시 만나는 시간
              </Text>
            </View>
            <Switch value={enabled} onValueChange={onToggleNotification} />
          </View>

          <Pressable
            onPress={() => setShowTimePicker((v) => !v)}
            disabled={!enabled}
            className="flex-row items-center border-t border-gray-100 px-4 py-4 dark:border-neutral-700"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : enabled ? 1 : 0.4 })}
          >
            <Text className="flex-1 text-base text-ink-900 dark:text-white">알림 시간</Text>
            <Text className="text-base text-gray-500 dark:text-gray-400">
              {formatTime(hour, minute)}
            </Text>
          </Pressable>

          {(Platform.OS === 'ios' ? showTimePicker : false) && enabled && (
            <View className="border-t border-gray-100 dark:border-neutral-700">
              <DateTimePicker
                value={tempDate}
                mode="time"
                display="spinner"
                onChange={onTimeChange}
                locale="ko-KR"
                themeVariant={preference === 'dark' ? 'dark' : preference === 'light' ? 'light' : undefined}
              />
            </View>
          )}

          {Platform.OS === 'android' && showTimePicker && enabled && (
            <DateTimePicker
              value={tempDate}
              mode="time"
              display="default"
              onChange={onTimeChange}
              is24Hour={false}
            />
          )}

          {permStatus === 'denied' && (
            <View className="border-t border-gray-100 px-4 py-3 dark:border-neutral-700">
              <Text className="text-xs text-red-500 dark:text-red-400">
                알림 권한이 거부됨 — 설정 → 모음 → 알림에서 허용해주세요.
              </Text>
              <Pressable onPress={() => Linking.openSettings()} className="mt-2">
                <Text className="text-xs font-bold text-accent-500">설정 열기 →</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* 내 데이터 */}
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
          <Pressable
            onPress={onExportByFolder}
            disabled={busy}
            className="flex-row items-center border-t border-gray-100 px-4 py-4 dark:border-neutral-700"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : busy ? 0.5 : 1 })}
          >
            <View className="flex-1">
              <Text className="text-base text-ink-900 dark:text-white">내보내기 / 공유</Text>
              <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                전체 또는 폴더별 JSON으로 카톡·메일·AirDrop
              </Text>
            </View>
            <Text className="text-base text-gray-400 dark:text-gray-500">↗︎</Text>
          </Pressable>
          <Pressable
            onPress={onImport}
            disabled={busy}
            className="flex-row items-center border-t border-gray-100 px-4 py-4 dark:border-neutral-700"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : busy ? 0.5 : 1 })}
          >
            <View className="flex-1">
              <Text className="text-base text-ink-900 dark:text-white">가져오기</Text>
              <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                다른 모음 사용자가 보낸 JSON 파일 열기 (중복 자동 건너뜀)
              </Text>
            </View>
            <Text className="text-base text-gray-400 dark:text-gray-500">↘︎</Text>
          </Pressable>
        </View>

        {/* 정보 */}
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
