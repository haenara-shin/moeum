import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import type { RootStackParamList } from '../navigation/types';
import { QuoteInputSchema, type QuoteInput } from '../types/quote';
import { useQuotesStore } from '../store/quotes';
import { recognizeText } from '../../modules/moeum-ocr';
import { removePageNumbers, removeBlankLines, tidyLineBreaks } from '../lib/cleanup';

type Nav = NativeStackNavigationProp<RootStackParamList, 'New'>;
type Route = NativeStackScreenProps<RootStackParamList, 'New'>['route'];

export function NewScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const add = useQuotesStore((s) => s.add);
  const [submitting, setSubmitting] = useState(false);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [usedOcr, setUsedOcr] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<QuoteInput>({
    resolver: zodResolver(QuoteInputSchema),
    mode: 'onChange',
    defaultValues: { body: '', author: '', source: '' },
  });

  const body = watch('body');

  const runOcrFromUri = useCallback(
    async (uri: string) => {
      setOcrRunning(true);
      try {
        const result = await recognizeText(uri);
        setValue('body', result.rawText.trim(), { shouldValidate: true });
        setUsedOcr(true);
      } catch (e) {
        Alert.alert('인식 실패', (e as Error).message);
      } finally {
        setOcrRunning(false);
      }
    },
    [setValue],
  );

  const pickFromCamera = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('카메라 권한이 필요합니다', '설정에서 권한을 허용해주세요.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });
    if (!res.canceled && res.assets[0]?.uri) {
      await runOcrFromUri(res.assets[0].uri);
    }
  }, [runOcrFromUri]);

  const pickFromLibrary = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('사진 라이브러리 권한이 필요합니다', '설정에서 권한을 허용해주세요.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });
    if (!res.canceled && res.assets[0]?.uri) {
      await runOcrFromUri(res.assets[0].uri);
    }
  }, [runOcrFromUri]);

  useEffect(() => {
    const source = route.params?.source;
    if (source === 'camera') void pickFromCamera();
    else if (source === 'library') void pickFromLibrary();
  }, [route.params?.source, pickFromCamera, pickFromLibrary]);

  const onSubmit = handleSubmit(async (input) => {
    setSubmitting(true);
    try {
      await add({
        body: input.body.trim(),
        author: input.author?.trim() || null,
        source: input.source?.trim() || null,
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('저장 실패', (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  });

  const applyCleanup = (fn: (s: string) => string) => {
    setValue('body', fn(body ?? ''), { shouldValidate: true });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        className="flex-1 bg-ink-50 dark:bg-neutral-900"
        keyboardShouldPersistTaps="handled"
      >
        <View className="p-4">
          {!usedOcr && (
            <View className="mb-4 flex-row gap-2">
              <Pressable
                onPress={pickFromCamera}
                disabled={ocrRunning}
                className="flex-1 items-center rounded-xl bg-white py-3 dark:bg-neutral-800"
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <Text className="text-xl">📷</Text>
                <Text className="mt-1 text-xs text-ink-900 dark:text-white">사진 찍기</Text>
              </Pressable>
              <Pressable
                onPress={pickFromLibrary}
                disabled={ocrRunning}
                className="flex-1 items-center rounded-xl bg-white py-3 dark:bg-neutral-800"
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <Text className="text-xl">🖼</Text>
                <Text className="mt-1 text-xs text-ink-900 dark:text-white">사진첩에서</Text>
              </Pressable>
            </View>
          )}

          {ocrRunning && (
            <View className="mb-4 flex-row items-center rounded-xl bg-blue-50 px-4 py-3 dark:bg-blue-950">
              <ActivityIndicator />
              <Text className="ml-3 text-sm text-blue-900 dark:text-blue-200">
                이미지에서 문장을 추출 중…
              </Text>
            </View>
          )}

          <Text className="mb-2 text-sm font-bold text-ink-900 dark:text-white">본문</Text>
          <Controller
            control={control}
            name="body"
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value ?? ''}
                onChangeText={onChange}
                placeholder="좋은 문장을 적어보세요"
                placeholderTextColor="#999"
                multiline
                textAlignVertical="top"
                className="min-h-[180px] rounded-xl bg-white p-4 text-base leading-6 text-ink-900 dark:bg-neutral-800 dark:text-white"
              />
            )}
          />
          {errors.body && (
            <Text className="mt-1 text-xs text-red-500">{errors.body.message}</Text>
          )}

          {usedOcr && (body ?? '').length > 0 && (
            <View className="mt-3">
              <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                빠른 정리
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <CleanupChip label="페이지 번호 제거" onPress={() => applyCleanup(removePageNumbers)} />
                <CleanupChip label="공백 줄 제거" onPress={() => applyCleanup(removeBlankLines)} />
                <CleanupChip label="줄바꿈 다듬기" onPress={() => applyCleanup(tidyLineBreaks)} />
                <CleanupChip
                  label="처음부터"
                  variant="danger"
                  onPress={() => {
                    setValue('body', '', { shouldValidate: true });
                    setUsedOcr(false);
                  }}
                />
              </View>
            </View>
          )}

          <Text className="mb-2 mt-6 text-sm font-bold text-ink-900 dark:text-white">
            저자 (선택)
          </Text>
          <Controller
            control={control}
            name="author"
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value ?? ''}
                onChangeText={onChange}
                placeholder="저자/화자"
                placeholderTextColor="#999"
                className="rounded-xl bg-white px-4 py-3 text-base text-ink-900 dark:bg-neutral-800 dark:text-white"
                autoCapitalize="none"
                autoCorrect={false}
              />
            )}
          />

          <Text className="mb-2 mt-6 text-sm font-bold text-ink-900 dark:text-white">
            출처 (선택)
          </Text>
          <Controller
            control={control}
            name="source"
            render={({ field: { onChange, value } }) => (
              <TextInput
                value={value ?? ''}
                onChangeText={onChange}
                placeholder="책 제목, URL 등"
                placeholderTextColor="#999"
                className="rounded-xl bg-white px-4 py-3 text-base text-ink-900 dark:bg-neutral-800 dark:text-white"
                autoCapitalize="none"
                autoCorrect={false}
              />
            )}
          />

          <Pressable
            onPress={onSubmit}
            disabled={!isValid || submitting}
            className={`mt-8 items-center rounded-2xl py-4 ${
              !isValid || submitting ? 'bg-gray-300 dark:bg-neutral-700' : 'bg-accent-500'
            }`}
          >
            <Text className="text-base font-bold text-white">
              {submitting ? '저장 중…' : '저장'}
            </Text>
          </Pressable>

          <Pressable onPress={() => navigation.goBack()} className="mt-3 items-center py-3">
            <Text className="text-sm text-gray-500 dark:text-gray-400">취소</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function CleanupChip({
  label,
  onPress,
  variant,
}: {
  label: string;
  onPress: () => void;
  variant?: 'danger';
}) {
  const isDanger = variant === 'danger';
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full px-3 py-2 ${
        isDanger
          ? 'bg-red-50 dark:bg-red-950'
          : 'bg-white dark:bg-neutral-800'
      }`}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <Text
        className={`text-xs font-medium ${
          isDanger
            ? 'text-red-600 dark:text-red-300'
            : 'text-ink-900 dark:text-white'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
