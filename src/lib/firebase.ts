import { initializeApp } from 'firebase/app';
// @ts-expect-error — getReactNativePersistence는 RN 전용 서브패스 타입 이슈가 알려져 있음 (런타임 정상)
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// TODO(M2-T2): Firebase 콘솔 값으로 교체 필요 — 값 교체 전까지 모임 탭 로그인은 동작하지 않음
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
