/**
 * 알림 탭 → 문장 상세 딥링크 — spec §1.3 (v3.1)
 * 콜드 스타트: getLastNotificationResponseAsync 1회 + 처리 식별자 기록으로 중복 방지
 * (식별자에 세대가 포함되므로 재사용 충돌 없음)
 */
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigationRef } from '../navigation/RootNavigator';
import { getQuote } from '../db';

const HANDLED_KEY = 'moeum-last-handled-response';

async function navigateWhenReady(quoteId: number): Promise<void> {
  for (let i = 0; i < 50 && !navigationRef.isReady(); i++) {
    await new Promise((r) => setTimeout(r, 100)); // 컨테이너 준비 대기 (최대 5초)
  }
  if (!navigationRef.isReady()) return;
  const quote = await getQuote(quoteId);
  if (quote) {
    navigationRef.navigate('MyQuotesTab', { screen: 'Detail', params: { id: quoteId } });
  } else {
    navigationRef.navigate('MyQuotesTab', { screen: 'List' }); // 삭제된 문장 폴백 (spec §1.3)
  }
}

async function handleResponse(response: Notifications.NotificationResponse): Promise<void> {
  const identifier = response.notification.request.identifier;
  const quoteId = (response.notification.request.content.data as { quoteId?: number } | null)
    ?.quoteId;
  if (typeof quoteId !== 'number') return; // daily·재충전 안내는 라우팅 없음
  const handled = await AsyncStorage.getItem(HANDLED_KEY);
  if (handled === identifier) return;
  await AsyncStorage.setItem(HANDLED_KEY, identifier);
  await navigateWhenReady(quoteId);
}

export function initNotificationRouting(): () => void {
  void Notifications.getLastNotificationResponseAsync()
    .then((res) => {
      if (res) void handleResponse(res).catch((e) => console.warn('[notificationRouting]', e));
    })
    .catch((e) => console.warn('[notificationRouting]', e));
  const sub = Notifications.addNotificationResponseReceivedListener((res) => {
    void handleResponse(res).catch((e) => console.warn('[notificationRouting]', e));
  });
  return () => sub.remove();
}
