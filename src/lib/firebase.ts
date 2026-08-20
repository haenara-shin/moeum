import { initializeApp } from 'firebase/app';
// @ts-expect-error — getReactNativePersistence는 RN 전용 서브패스 타입 이슈가 알려져 있음 (런타임 정상)
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 공개 가능한 클라이언트 식별값 — 보안은 Firestore 규칙이 담당 (spec §2.2)
const firebaseConfig = {
  apiKey: 'AIzaSyB2c4S097q7e8l-XV1OroGF2_YAPLLV5vg',
  authDomain: 'moeum-app.firebaseapp.com',
  projectId: 'moeum-app',
  storageBucket: 'moeum-app.firebasestorage.app',
  messagingSenderId: '567386321943',
  appId: '1:567386321943:web:2bb27ab9792ceb4a9bd852',
};

export const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
export const db = getFirestore(app);
