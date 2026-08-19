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
