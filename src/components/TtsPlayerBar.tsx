import { Pressable, Text, View } from 'react-native';
import { useTtsPlayerStore } from '../store/ttsPlayer';
import { truncate } from '../lib/format';

export function TtsPlayerBar() {
  const { current, isPlaying, queue, currentIndex, pause, resume, next, prev, stop } =
    useTtsPlayerStore();

  if (!current) return null;

  return (
    <View
      pointerEvents="box-none"
      className="absolute bottom-0 left-0 right-0 px-3 pb-6"
    >
      <View className="rounded-2xl bg-ink-900 px-4 py-3 shadow-lg dark:bg-neutral-100">
        <View className="flex-row items-center">
          <View className="flex-1 mr-3">
            <Text className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-600">
              {currentIndex + 1} / {queue.length}
            </Text>
            <Text
              numberOfLines={1}
              className="mt-0.5 text-sm text-white dark:text-ink-900"
            >
              {truncate(current.body, 60)}
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            <Pressable onPress={prev} hitSlop={8}>
              <Text className="text-xl text-white dark:text-ink-900">⏮</Text>
            </Pressable>
            <Pressable
              onPress={isPlaying ? pause : resume}
              hitSlop={8}
              className="h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-ink-900"
            >
              <Text className="text-base text-ink-900 dark:text-white">
                {isPlaying ? '⏸' : '▶︎'}
              </Text>
            </Pressable>
            <Pressable onPress={next} hitSlop={8}>
              <Text className="text-xl text-white dark:text-ink-900">⏭</Text>
            </Pressable>
            <Pressable onPress={stop} hitSlop={8}>
              <Text className="text-base text-gray-400 dark:text-gray-500">✕</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
