import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuthStore } from '../store/auth';
import { AppleAuthCanceledError } from '../lib/appleAuth';
import { useThemeStore, resolveScheme } from '../store/theme';

export function GroupsGateScreen() {
  const { initializing, uid, profile, profileLoading } = useAuthStore();

  if (initializing || profileLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-ink-50 dark:bg-neutral-900">
        <ActivityIndicator />
      </View>
    );
  }
  if (!uid) return <SignInView />;
  if (!profile) return <ProfileSetupView />;
  return <GroupListShellView nickname={profile.nickname} />;
}

function SignInView() {
  const signIn = useAuthStore((s) => s.signIn);
  const [busy, setBusy] = useState(false);
  const system = useColorScheme();
  const preference = useThemeStore((s) => s.preference);
  const dark = resolveScheme(preference, system) === 'dark';

  const onPress = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await signIn();
    } catch (e) {
      if (!(e instanceof AppleAuthCanceledError)) {
        Alert.alert('로그인 실패', (e as Error).message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-ink-50 px-8 dark:bg-neutral-900">
      <Text className="text-5xl">👥</Text>
      <Text className="mt-6 text-xl font-bold text-ink-900 dark:text-white">
        모임에서 문장을 나눠보세요
      </Text>
      <Text className="mt-3 text-center text-sm leading-6 text-gray-500 dark:text-gray-400">
        초대한 사람들끼리 좋은 문장을 올리고{'\n'}댓글로 생각을 나누는 공간이에요.{'\n'}
        내 컬렉션은 지금처럼 기기에만 보관됩니다.
      </Text>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={
          dark
            ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
            : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
        }
        cornerRadius={12}
        style={{ marginTop: 32, width: 260, height: 48, opacity: busy ? 0.5 : 1 }}
        onPress={() => void onPress()}
      />
      <Text className="mt-4 text-center text-[11px] text-gray-400 dark:text-gray-500">
        로그인하면 모임에 올린 문장·댓글·닉네임만 서버에 저장돼요
      </Text>
    </View>
  );
}

function ProfileSetupView() {
  const createProfile = useAuthStore((s) => s.createProfile);
  const [nickname, setNickname] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const valid = nickname.trim().length >= 1 && nickname.trim().length <= 20 && agreed;

  const onSubmit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await createProfile(nickname);
    } catch (e) {
      Alert.alert('프로필 만들기 실패', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-ink-50 dark:bg-neutral-900"
      contentContainerStyle={{ padding: 24 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-xl font-bold text-ink-900 dark:text-white">거의 다 됐어요</Text>
      <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        모임에서 표시될 닉네임을 정해주세요.
      </Text>
      <TextInput
        value={nickname}
        onChangeText={setNickname}
        placeholder="닉네임 (1~20자)"
        maxLength={20}
        autoCorrect={false}
        className="mt-6 rounded-xl bg-white px-4 py-3 text-base text-ink-900 dark:bg-neutral-800 dark:text-white"
      />
      <Pressable
        onPress={() => setAgreed((v) => !v)}
        className="mt-6 flex-row items-start"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agreed }}
      >
        <Text className="mr-2 text-base">{agreed ? '☑️' : '⬜️'}</Text>
        <Text className="flex-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
          내가 권리를 가진 문장만 올리고, 타인에게 불쾌감을 주거나 불법인 콘텐츠를 올리지
          않겠습니다.
        </Text>
      </Pressable>
      <Pressable
        onPress={() => void onSubmit()}
        disabled={!valid || busy}
        className={`mt-8 items-center rounded-xl py-4 ${valid ? 'bg-accent-500' : 'bg-gray-300 dark:bg-neutral-700'}`}
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      >
        <Text className="text-base font-bold text-white">{busy ? '만드는 중…' : '시작하기'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function GroupListShellView({ nickname }: { nickname: string }) {
  const comingSoon = () => Alert.alert('곧 만나요', '모임 만들기·참여는 다음 업데이트에서 열려요.');
  return (
    <View className="flex-1 items-center justify-center bg-ink-50 px-8 dark:bg-neutral-900">
      <Text className="text-5xl">🌱</Text>
      <Text className="mt-6 text-lg font-bold text-ink-900 dark:text-white">
        {nickname}님, 첫 모임을 준비 중이에요
      </Text>
      <Text className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
        모임 만들기와 초대 코드 참여가 곧 열립니다.
      </Text>
      <View className="mt-8 w-full flex-row justify-center gap-3">
        <Pressable
          onPress={comingSoon}
          className="rounded-full bg-accent-500 px-6 py-3"
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
        >
          <Text className="text-sm font-bold text-white">모임 만들기</Text>
        </Pressable>
        <Pressable
          onPress={comingSoon}
          className="rounded-full bg-white px-6 py-3 dark:bg-neutral-800"
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
        >
          <Text className="text-sm font-bold text-accent-500">코드로 참여</Text>
        </Pressable>
      </View>
    </View>
  );
}
