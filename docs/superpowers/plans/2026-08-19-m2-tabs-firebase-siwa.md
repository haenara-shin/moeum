# M2 — 3탭 재편 + Firebase + Sign in with Apple Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 앱을 하단 3탭([내 문장 | 모임 | 설정])으로 재편하고, Firebase(JS SDK) + Sign in with Apple(nonce) 지연 로그인 + 닉네임 프로필 생성을 구현한다. 그룹 CRUD는 M3 — M2의 모임 탭은 로그인 게이트 → 프로필 설정 → 빈 그룹 셸까지.

**Architecture:** 기존 단일 스택을 "내 문장" 탭 내부 스택으로 강등(타입 이름 `RootStackParamList`를 유지해 New/Detail/Edit 화면 무수정). Firebase는 네이티브 모듈 없이 JS SDK(`firebase`)로, Auth persistence는 AsyncStorage. SIWA는 `expo-apple-authentication`(+`expo-crypto` nonce) — M2의 유일한 네이티브 추가이며 dev client 재빌드 1회를 T6에 격리한다.

**Tech Stack:** @react-navigation/bottom-tabs(JS) / firebase v12(JS SDK) / expo-apple-authentication / expo-crypto / zustand

**Spec:** `docs/superpowers/specs/2026-08-18-interval-alerts-and-groups-design.md` §2.1·2.2·2.8, §4 M2 (v3.1)

## Global Constraints

- Expo SDK **54 고정**, pnpm. **@react-native-firebase 금지** — Firebase는 JS SDK만 (spec §2.2)
- 네이티브 추가는 `expo-apple-authentication`·`expo-crypto`만 (Expo 1st-party). 그 외 네이티브 의존성 금지
- **M1 회귀 금지**: 알림 탭 딥링크(콜드/웜)·간격 알림·TTS·기존 4개 화면 동작 보존. 특히 notificationRouting은 탭 중첩 경로로 수정 필수
- 매 로그인·재인증마다 **새 nonce** (원본→Firebase credential, SHA-256 해시→Apple 요청)
- `initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })` 필수
- 닉네임 1–20자, users 문서 필드 = `{ nickname, createdAt, blockedUids: [], rulesVersion, rulesAcceptedAt }` (serverTimestamp), `RULES_VERSION = 1`
- 검증 명령: `pnpm exec tsc --noEmit` / `pnpm exec vitest run` (RTK 훅이 `pnpm lint`/`pnpm test`를 가로채므로 직접 형태만 사용)
- 커밋: 한국어 conventional + 마지막 줄 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- 파일 참조 기준: M1 완료 시점 `10c7b38`

---

### Task 1: 하단 3탭 재편 + 딥링크 경로 수정

**Files:**
- Modify: `package.json` (`@react-navigation/bottom-tabs` 추가)
- Modify: `src/navigation/types.ts` (전면 교체)
- Modify: `src/navigation/RootNavigator.tsx` (전면 교체)
- Create: `src/screens/GroupsGateScreen.tsx` (M2 임시 플레이스홀더 — Task 4에서 본 구현으로 교체)
- Modify: `src/screens/ListScreen.tsx:59-82` (설정 headerRight 제거)
- Modify: `src/lib/notificationRouting.ts` (중첩 navigate)

**Interfaces:**
- Consumes: 기존 `RootStackParamList` 소비 화면들(New/Detail/Edit — 무수정 컴파일이 요구사항)
- Produces:
  - `RootStackParamList = { List; New: { source?: 'camera' | 'library' } | undefined; Detail: { id: number }; Edit: { id: number } }` (Settings 제거, 이름 유지)
  - `GroupsStackParamList = { GroupsGate: undefined }`
  - `RootTabParamList = { MyQuotesTab: NavigatorScreenParams<RootStackParamList>; GroupsTab: NavigatorScreenParams<GroupsStackParamList>; SettingsTab: undefined }`
  - `navigationRef: createNavigationContainerRef<RootTabParamList>` (export 유지)

- [ ] **Step 1: 의존성**

```bash
pnpm add @react-navigation/bottom-tabs
```

- [ ] **Step 2: `src/navigation/types.ts` 교체**

```ts
import type { NavigatorScreenParams } from '@react-navigation/native';

// 이름 유지: New/Detail/Edit 화면들이 이 이름으로 타입을 참조한다 (무수정 컴파일)
export type RootStackParamList = {
  List: undefined;
  New: { source?: 'camera' | 'library' } | undefined;
  Detail: { id: number };
  Edit: { id: number };
};

export type GroupsStackParamList = {
  GroupsGate: undefined;
};

export type RootTabParamList = {
  MyQuotesTab: NavigatorScreenParams<RootStackParamList>;
  GroupsTab: NavigatorScreenParams<GroupsStackParamList>;
  SettingsTab: undefined;
};
```

- [ ] **Step 3: 플레이스홀더 `src/screens/GroupsGateScreen.tsx` 생성** (Task 4에서 교체)

```tsx
import { Text, View } from 'react-native';

export function GroupsGateScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-ink-50 dark:bg-neutral-900">
      <Text className="text-sm text-gray-500 dark:text-gray-400">모임 — 준비 중</Text>
    </View>
  );
}
```

- [ ] **Step 4: `src/navigation/RootNavigator.tsx` 교체**

```tsx
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  createNavigationContainerRef,
  type Theme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, useColorScheme } from 'react-native';
import type {
  GroupsStackParamList,
  RootStackParamList,
  RootTabParamList,
} from './types';
import { ListScreen } from '../screens/ListScreen';
import { NewScreen } from '../screens/NewScreen';
import { DetailScreen } from '../screens/DetailScreen';
import { EditScreen } from '../screens/EditScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { GroupsGateScreen } from '../screens/GroupsGateScreen';
import { useThemeStore, resolveScheme } from '../store/theme';

const Tab = createBottomTabNavigator<RootTabParamList>();
const QuotesStack = createNativeStackNavigator<RootStackParamList>();
const GroupsStack = createNativeStackNavigator<GroupsStackParamList>();

export const navigationRef = createNavigationContainerRef<RootTabParamList>();

const lightTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#FAFAF7',
    card: '#FAFAF7',
    text: '#111',
    border: '#E5E7EB',
    primary: '#5B4FE5',
  },
};

const darkTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0B0B0C',
    card: '#0B0B0C',
    text: '#F5F5F5',
    border: '#27272A',
    primary: '#7C71FF',
  },
};

function QuotesStackNavigator() {
  return (
    <QuotesStack.Navigator
      initialRouteName="List"
      screenOptions={{ headerTitleStyle: { fontWeight: '700' } }}
    >
      <QuotesStack.Screen name="List" component={ListScreen} options={{ title: '모두의 마음가짐' }} />
      <QuotesStack.Screen
        name="New"
        component={NewScreen}
        options={{ title: '새 문장', presentation: 'modal' }}
      />
      <QuotesStack.Screen name="Detail" component={DetailScreen} options={{ title: '' }} />
      <QuotesStack.Screen
        name="Edit"
        component={EditScreen}
        options={{ title: '편집', presentation: 'modal' }}
      />
    </QuotesStack.Navigator>
  );
}

function GroupsStackNavigator() {
  return (
    <GroupsStack.Navigator screenOptions={{ headerTitleStyle: { fontWeight: '700' } }}>
      <GroupsStack.Screen name="GroupsGate" component={GroupsGateScreen} options={{ title: '모임' }} />
    </GroupsStack.Navigator>
  );
}

function TabIcon({ glyph }: { glyph: string }) {
  return <Text style={{ fontSize: 18 }}>{glyph}</Text>;
}

export function RootNavigator() {
  const system = useColorScheme();
  const preference = useThemeStore((s) => s.preference);
  const scheme = resolveScheme(preference, system);
  const theme = scheme === 'dark' ? darkTheme : lightTheme;

  return (
    <NavigationContainer ref={navigationRef} theme={theme}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarLabelStyle: { fontFamily: 'Pretendard-Bold', fontSize: 11 },
        }}
      >
        <Tab.Screen
          name="MyQuotesTab"
          component={QuotesStackNavigator}
          options={{ tabBarLabel: '내 문장', tabBarIcon: () => <TabIcon glyph="✍️" /> }}
        />
        <Tab.Screen
          name="GroupsTab"
          component={GroupsStackNavigator}
          options={{ tabBarLabel: '모임', tabBarIcon: () => <TabIcon glyph="👥" /> }}
        />
        <Tab.Screen
          name="SettingsTab"
          component={SettingsScreen}
          options={{
            headerShown: true,
            title: '설정',
            headerTitleStyle: { fontWeight: '700' },
            tabBarLabel: '설정',
            tabBarIcon: () => <TabIcon glyph="⚙️" />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
```

- [ ] **Step 5: ListScreen 설정 버튼 제거**

`src/screens/ListScreen.tsx`에서 `useLayoutEffect(() => { navigation.setOptions({ headerRight: ... }) }, [navigation]);` 블록(59–82행) 전체 삭제. import에서 `useLayoutEffect` 제거(다른 사용처 없음).

- [ ] **Step 6: notificationRouting 중첩 navigate 수정**

`src/lib/notificationRouting.ts`의 `navigateWhenReady` 내 두 navigate를:

```ts
navigationRef.navigate('MyQuotesTab', { screen: 'Detail', params: { id: quoteId } });
```
```ts
navigationRef.navigate('MyQuotesTab', { screen: 'List' });
```

- [ ] **Step 7: 검증 + Commit**

Run: `pnpm exec tsc --noEmit` (New/Detail/Edit 무수정 통과가 곧 타입 전략 검증) / `pnpm exec vitest run` 15/15

```bash
git add package.json pnpm-lock.yaml src/navigation/types.ts src/navigation/RootNavigator.tsx src/screens/GroupsGateScreen.tsx src/screens/ListScreen.tsx src/lib/notificationRouting.ts
git commit -m "feat(M2): 하단 3탭 재편 — 내 문장/모임/설정 + 알림 딥링크 중첩 경로

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Firebase 프로젝트 셋업 + SDK 초기화

**Files:**
- Modify: `package.json` (firebase, expo-apple-authentication, expo-crypto)
- Modify: `app.json` (ios.usesAppleSignIn)
- Create: `src/lib/firebase.ts`
- Create: `firebase/firestore.rules` (repo 보존용 — 적용은 콘솔 붙여넣기)

**Interfaces:**
- Consumes: 없음
- Produces: `app`, `auth`(AsyncStorage persistence), `db` export — 이후 모든 Firebase 사용의 유일한 진입점

- [ ] **Step 1: 사용자 수동 단계 (콘솔) — 구현자는 이 값을 받을 때까지 NEEDS_CONTEXT로 대기**

1. https://console.firebase.google.com → **프로젝트 추가** → 이름 `moeum` → Google Analytics **끄기** → 생성
2. 프로젝트 홈 → **웹 앱(</>)** 추가 → 닉네임 `moeum-app` (호스팅 체크 안 함) → **firebaseConfig 6개 값 복사** (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId)
3. **Authentication → Sign-in method → Apple 활성화** (Service ID 등 추가 입력 없이 저장 — iOS 네이티브 토큰 교환에는 불필요)
4. **Firestore Database → 데이터베이스 만들기** → 위치 `asia-northeast3 (서울)` → **프로덕션 모드**
5. Firestore → 규칙 탭 → Step 4의 rules 붙여넣기 → 게시

- [ ] **Step 2: 의존성 + app.json**

```bash
pnpm add firebase expo-apple-authentication expo-crypto
```

`app.json`의 `ios` 객체에 추가: `"usesAppleSignIn": true`

- [ ] **Step 3: `src/lib/firebase.ts` 생성** (config 값은 Step 1에서 받은 실제 값)

```ts
import { initializeApp } from 'firebase/app';
// @ts-expect-error — getReactNativePersistence는 RN 전용 서브패스 타입 이슈가 알려져 있음 (런타임 정상)
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 공개 가능한 클라이언트 식별값 — 보안은 Firestore 규칙이 담당 (spec §2.2)
const firebaseConfig = {
  apiKey: '<콘솔 값>',
  authDomain: '<콘솔 값>',
  projectId: '<콘솔 값>',
  storageBucket: '<콘솔 값>',
  messagingSenderId: '<콘솔 값>',
  appId: '<콘솔 값>',
};

export const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
export const db = getFirestore(app);
```

주의(알려진 이슈): 실행 시 `Component auth has not been registered yet` 오류가 나면 `metro.config.js`에 `config.resolver.unstable_enablePackageExports = false;`를 추가한다 (Expo SDK 53+ package exports ↔ firebase JS SDK 호환 이슈). `@ts-expect-error`는 tsc가 해당 라인에서 오류를 내지 않으면 제거.

- [ ] **Step 4: `firebase/firestore.rules` 생성** (M2 범위 — users self-only. M3에서 spec §2.4a 전체 매트릭스로 교체 + 에뮬레이터 테스트 도입)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow get: if request.auth != null && request.auth.uid == uid;
      allow create, update: if request.auth != null
        && request.auth.uid == uid
        && request.resource.data.keys().hasOnly(['nickname', 'createdAt', 'blockedUids', 'rulesVersion', 'rulesAcceptedAt'])
        && request.resource.data.nickname is string
        && request.resource.data.nickname.size() >= 1
        && request.resource.data.nickname.size() <= 20;
      // list·delete 불가 (delete는 M5 계정 삭제에서 허용 예정)
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 5: 검증 + Commit**

Run: `pnpm exec tsc --noEmit` / `pnpm exec vitest run` 15/15

```bash
git add package.json pnpm-lock.yaml app.json src/lib/firebase.ts firebase/firestore.rules
git commit -m "feat(M2): Firebase JS SDK 초기화 + SIWA 의존성 + users 규칙 v1

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: SIWA 로그인(nonce) + auth store

**Files:**
- Create: `src/lib/appleAuth.ts`
- Create: `src/store/auth.ts`

**Interfaces:**
- Consumes: Task 2의 `auth`, `db`
- Produces:
  - `signInWithApple(): Promise<void>` (취소 시 `AppleAuthCanceledError` throw)
  - `useAuthStore`: `{ initializing: boolean; uid: string | null; profile: { nickname: string } | null; profileLoading: boolean; signIn(): Promise<void>; signOutUser(): Promise<void>; createProfile(nickname: string): Promise<void>; }`
  - `RULES_VERSION = 1`

- [ ] **Step 1: `src/lib/appleAuth.ts`**

```ts
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { OAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from './firebase';

export class AppleAuthCanceledError extends Error {}

/** SIWA → Firebase. 매 호출마다 새 nonce (spec §2.2 — 재인증 포함) */
export async function signInWithApple(): Promise<void> {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );
  let appleCred: AppleAuthentication.AppleAuthenticationCredential;
  try {
    appleCred = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') {
      throw new AppleAuthCanceledError();
    }
    throw e;
  }
  if (!appleCred.identityToken) throw new Error('Apple 인증 토큰을 받지 못했습니다');
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken: appleCred.identityToken,
    rawNonce,
  });
  await signInWithCredential(auth, credential);
}
```

- [ ] **Step 2: `src/store/auth.ts`**

```ts
import { create } from 'zustand';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { signInWithApple } from '../lib/appleAuth';

export const RULES_VERSION = 1;

type Profile = { nickname: string };

type AuthState = {
  initializing: boolean; // 첫 onAuthStateChanged 콜백 전
  uid: string | null;
  profile: Profile | null; // null이면 ProfileSetup 필요
  profileLoading: boolean;
  signIn: () => Promise<void>;
  signOutUser: () => Promise<void>;
  createProfile: (nickname: string) => Promise<void>;
};

async function fetchProfile(uid: string): Promise<Profile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const data = snap.data() as { nickname?: string };
  return typeof data.nickname === 'string' ? { nickname: data.nickname } : null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  initializing: true,
  uid: null,
  profile: null,
  profileLoading: false,

  signIn: async () => {
    await signInWithApple(); // 상태 갱신은 onAuthStateChanged가 담당
  },

  signOutUser: async () => {
    await signOut(auth);
    set({ uid: null, profile: null });
  },

  createProfile: async (nickname) => {
    const uid = get().uid;
    if (!uid) throw new Error('로그인이 필요합니다');
    const trimmed = nickname.trim();
    if (trimmed.length < 1 || trimmed.length > 20) throw new Error('닉네임은 1~20자입니다');
    await setDoc(doc(db, 'users', uid), {
      nickname: trimmed,
      createdAt: serverTimestamp(),
      blockedUids: [],
      rulesVersion: RULES_VERSION,
      rulesAcceptedAt: serverTimestamp(),
    });
    set({ profile: { nickname: trimmed } });
  },
}));

onAuthStateChanged(auth, (user) => {
  if (!user) {
    useAuthStore.setState({ initializing: false, uid: null, profile: null, profileLoading: false });
    return;
  }
  useAuthStore.setState({ initializing: false, uid: user.uid, profileLoading: true });
  fetchProfile(user.uid)
    .then((profile) => useAuthStore.setState({ profile, profileLoading: false }))
    .catch((e) => {
      console.warn('[auth] 프로필 조회 실패', e);
      useAuthStore.setState({ profileLoading: false });
    });
});
```

- [ ] **Step 3: 검증 + Commit**

Run: `pnpm exec tsc --noEmit` / `pnpm exec vitest run` 15/15

```bash
git add src/lib/appleAuth.ts src/store/auth.ts
git commit -m "feat(M2): SIWA nonce 로그인 + auth store — 프로필 조회·생성·로그아웃

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: GroupsGateScreen 본 구현 (로그인 → 규칙 동의+닉네임 → 빈 셸)

**Files:**
- Modify: `src/screens/GroupsGateScreen.tsx` (플레이스홀더 교체)

**Interfaces:**
- Consumes: `useAuthStore` 전부, `AppleAuthCanceledError`
- Produces: 없음 (화면)

- [ ] **Step 1: 파일 교체**

```tsx
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
```

- [ ] **Step 2: 검증 + Commit**

Run: `pnpm exec tsc --noEmit` / `pnpm exec vitest run` 15/15

```bash
git add src/screens/GroupsGateScreen.tsx
git commit -m "feat(M2): 모임 게이트 — SIWA 로그인·닉네임+규칙 동의·빈 그룹 셸

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: 설정 탭 계정 섹션

**Files:**
- Modify: `src/screens/SettingsScreen.tsx` ("정보" 섹션 위에 "계정" 섹션 삽입)

**Interfaces:**
- Consumes: `useAuthStore` (`uid`, `profile`, `signOutUser`)
- Produces: 없음

- [ ] **Step 1: 구현**

컴포넌트 상단에 추가:

```ts
const { uid, profile, signOutUser } = useAuthStore();
```
(파일 상단 import: `import { useAuthStore } from '../store/auth';`)

`{/* 정보 */}` 주석 바로 위에 섹션 삽입:

```tsx
{/* 계정 */}
<Text className="mb-3 mt-8 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
  계정
</Text>
<View className="overflow-hidden rounded-2xl bg-white dark:bg-neutral-800">
  {uid ? (
    <>
      <View className="flex-row items-center px-4 py-4">
        <Text className="flex-1 text-base text-ink-900 dark:text-white">닉네임</Text>
        <Text className="text-base text-gray-500 dark:text-gray-400">
          {profile?.nickname ?? '설정 전'}
        </Text>
      </View>
      <Pressable
        onPress={() =>
          Alert.alert('로그아웃할까요?', '모임 데이터는 서버에 안전하게 남아 있어요.', [
            { text: '취소', style: 'cancel' },
            { text: '로그아웃', style: 'destructive', onPress: () => void signOutUser() },
          ])
        }
        className="border-t border-gray-100 px-4 py-4 dark:border-neutral-700"
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Text className="text-base text-red-500 dark:text-red-400">로그아웃</Text>
      </Pressable>
    </>
  ) : (
    <View className="px-4 py-4">
      <Text className="text-sm text-gray-500 dark:text-gray-400">
        모임 탭에서 Apple로 로그인하면 문장을 나눌 수 있어요.
      </Text>
    </View>
  )}
</View>
```

- [ ] **Step 2: 검증 + Commit**

Run: `pnpm exec tsc --noEmit` / `pnpm exec vitest run` 15/15

```bash
git add src/screens/SettingsScreen.tsx
git commit -m "feat(M2): 설정 계정 섹션 — 닉네임 표시·로그아웃

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: 재빌드 + 수동 검증 + 문서

**Files:**
- Modify: `docs/CONTEXT.md` (M2 체크 + 검증 체크리스트)

**Interfaces:** 전체 통합

- [ ] **Step 1: 네이티브 재빌드** (usesAppleSignIn entitlement + 새 pod)

```bash
pnpm prebuild        # ios/ 재생성 (--clean 포함됨)
pnpm ios             # 시뮬레이터 dev client 재빌드·실행
```
시뮬레이터 SIWA는 시뮬레이터의 설정 앱 → Apple ID 로그인이 되어 있어야 동작.

- [ ] **Step 2: 수동 검증 체크리스트**

1. 하단 3탭 표시·전환, 각 탭 헤더 정상
2. **M1 회귀**: 문장 추가→알림 예약, 알림 탭→내 문장 탭의 Detail로 이동(콜드 스타트 포함), TTS·폴더·검색 정상
3. 모임 탭: Apple 로그인 시트 → 성공 → 닉네임+규칙 동의 → "시작하기" → 빈 그룹 셸
4. Firebase 콘솔 → Firestore → `users/{uid}` 문서 생성 확인 (nickname·rulesVersion 등 5필드)
5. 앱 완전 종료 후 재실행 → 로그인 유지 + 프로필 스킵(바로 셸)
6. 설정 탭: 닉네임 표시 → 로그아웃 → 모임 탭이 로그인 화면으로 복귀
7. 로그인 취소(시트 닫기) → 에러 얼럿 없이 조용히 복귀

- [ ] **Step 3: CONTEXT.md 갱신 + Commit + push**

M2 체크박스 체크, 다음 단계를 M3으로.

```bash
git add docs/CONTEXT.md
git commit -m "docs(M2): 탭·Firebase·SIWA 완료 — CONTEXT 갱신

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push
```

---

## Self-Review 결과 (작성자 체크)

- **Spec 커버리지**: §2.1 지연 로그인(모임 탭 게이트)=T4, §2.2 JS SDK·nonce·persistence·usesAppleSignIn=T2/T3, §2.8 3탭·ProfileSetup(규칙 동의·rulesVersion)=T1/T4, §2.3 users 필드=T3(createProfile)+T2(rules 검증), M1 딥링크 보존=T1 Step 6. "그룹에 올리기" 진입 게이트는 M3(DetailScreen 버튼이 M3 산출물)로 이월 — spec §2.1의 해당 문구는 M3 plan에서 구현.
- **Placeholder 스캔**: `<콘솔 값>`은 실행 시점 사용자 입력으로 명시(T2 Step 1 NEEDS_CONTEXT 규정) — 의도된 유일한 외부 입력. 그 외 TBD 없음.
- **타입 일관성**: `RootStackParamList` 이름 유지 전략으로 New/Detail/Edit 무수정 — T1 Step 7의 tsc가 검증 게이트. `useAuthStore` 시그니처가 T3 정의 ↔ T4/T5 소비 일치. `AppleAuthCanceledError` T3 정의 ↔ T4 소비 일치.
- **리스크 노트**: firebase↔metro package exports 이슈는 T2에 증상·해법 명기. 시뮬레이터 SIWA 전제(Apple ID 로그인)는 T6에 명기.
