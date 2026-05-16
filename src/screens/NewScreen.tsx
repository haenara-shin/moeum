import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { RootStackParamList } from '../navigation/types';
import { QuoteInputSchema, type QuoteInput } from '../types/quote';
import { useQuotesStore } from '../store/quotes';

type Nav = NativeStackNavigationProp<RootStackParamList, 'New'>;

export function NewScreen() {
  const navigation = useNavigation<Nav>();
  const add = useQuotesStore((s) => s.add);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<QuoteInput>({
    resolver: zodResolver(QuoteInputSchema),
    mode: 'onChange',
    defaultValues: { body: '', author: '', source: '' },
  });

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
                className="min-h-[160px] rounded-xl bg-white p-4 text-base leading-6 text-ink-900 dark:bg-neutral-800 dark:text-white"
              />
            )}
          />
          {errors.body && (
            <Text className="mt-1 text-xs text-red-500">{errors.body.message}</Text>
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
