/**
 * 매일 1회 로컬 알림 — PRD §5.1 FR-005
 *
 * 전략 (MVP 단순화):
 * - 동일 시간 매일 트리거 (DailyTriggerInput)
 * - 메시지는 정적: "오늘의 마음가짐 — 저장한 좋은 문장을 만나러 가보세요"
 * - 앱 진입 시 random 1개 노출
 * - 추후 7일치 prefetch + 랜덤 내용 차별화는 Phase 2
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const DAILY_NOTIFICATION_ID = 'moeum-daily';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const req = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return req.status === 'granted';
}

export async function getPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function scheduleDaily(hour: number, minute: number): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_NOTIFICATION_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_NOTIFICATION_ID,
    content: {
      title: '오늘의 마음가짐',
      body: '저장한 좋은 문장을 만나러 가보세요.',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelDaily(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_NOTIFICATION_ID).catch(() => {});
}

export async function getScheduledDaily(): Promise<Notifications.NotificationRequest | null> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all.find((n) => n.identifier === DAILY_NOTIFICATION_ID) ?? null;
}

export async function getScheduledIdsByPrefix(prefix: string): Promise<string[]> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all.map((n) => n.identifier).filter((id) => id.startsWith(prefix));
}

export async function scheduleQuoteNotification(
  identifier: string,
  body: string,
  date: Date,
  quoteId: number,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: '모두의 마음가짐',
      body,
      sound: 'default',
      data: { quoteId },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
}

export async function scheduleReminderNotification(identifier: string, date: Date): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: '모두의 마음가짐',
      body: '앱을 열면 알림이 이어져요',
      sound: 'default',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
}

export async function cancelNotifications(identifiers: string[]): Promise<void> {
  await Promise.all(
    identifiers.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})),
  );
}
