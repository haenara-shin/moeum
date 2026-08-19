/**
 * 알림 스케줄 리컨실러 — spec §1.2 (v3.1)
 * daily/interval 모드 공통의 단일 수렴 지점: 모든 설정 변경·앱 이벤트가
 * 이 함수를 호출하고, 여기서만 예약/취소가 일어난다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  computeSlotPlan,
  reconcileQueue,
  takeFromQueue,
  truncateBody,
  firesPerDay,
  type QueueState,
} from './intervalSchedule';
import {
  cancelDaily,
  cancelNotifications,
  getPermissionStatus,
  scheduleDaily,
  scheduleQuoteNotification,
  scheduleReminderNotification,
} from './notifications';
import { listQuotesForScheduler } from '../db';
import { useNotificationStore, waitForNotificationHydration } from '../store/notification';

const STATE_KEY = 'moeum-interval-state';

type SchedulerState = {
  generation: number;
  queue: QueueState;
  scheduled: { id: string; at: number }[];
};

async function loadState(): Promise<SchedulerState | null> {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    return raw ? (JSON.parse(raw) as SchedulerState) : null;
  } catch {
    return null;
  }
}

async function saveState(s: SchedulerState): Promise<void> {
  await AsyncStorage.setItem(STATE_KEY, JSON.stringify(s));
}

// single-flight: 동시 호출은 직렬 체인으로 병합 (spec §1.2)
let chain: Promise<void> = Promise.resolve();

export function syncNotificationSchedule(reason: 'integrity' | 'topup'): Promise<void> {
  chain = chain.then(() => run(reason)).catch(() => {});
  return chain;
}

async function run(reason: 'integrity' | 'topup'): Promise<void> {
  await waitForNotificationHydration();
  const st = useNotificationStore.getState();
  const prev = (await loadState()) ?? { generation: 0, queue: { ids: [], cursor: 0 }, scheduled: [] };

  const cancelAllInterval = async () => {
    if (prev.scheduled.length > 0) {
      await cancelNotifications(prev.scheduled.map((s) => s.id));
      await saveState({ ...prev, scheduled: [] });
    }
  };

  // 꺼짐: 둘 다 정리
  if (!st.enabled) {
    await cancelDaily();
    await cancelAllInterval();
    return;
  }

  const perm = await getPermissionStatus();
  if (perm !== 'granted') return; // 권한 UX는 설정 화면이 담당

  if (st.mode === 'daily') {
    await cancelAllInterval();
    await scheduleDaily(st.hour, st.minute);
    return;
  }

  // interval 모드
  await cancelDaily();

  const quotes = await listQuotesForScheduler();
  if (quotes.length === 0) {
    await cancelAllInterval(); // 문장 0개 전환 (spec §1.1)
    return;
  }

  const settings = {
    intervalHours: st.intervalHours,
    activeStartHour: st.activeStartHour,
    activeEndHour: st.activeEndHour,
  };
  const now = Date.now();
  const futureCount = prev.scheduled.filter((s) => s.at > now).length;
  if (reason === 'topup' && futureCount >= firesPerDay(settings)) return; // 하루치 이상 남음

  // 전체 재예약 (세대 +1)
  await cancelNotifications(prev.scheduled.map((s) => s.id));
  const generation = prev.generation + 1;
  const { fireDates, reminderDate } = computeSlotPlan(settings, new Date(now));
  const bodyById = new Map(quotes.map((q) => [q.id, q.body]));
  let queue = reconcileQueue(
    prev.queue.ids.length > 0 ? prev.queue : null,
    quotes.map((q) => q.id),
    Math.random,
  );
  const { picked, next } = takeFromQueue(queue, fireDates.length, Math.random);

  const scheduled: { id: string; at: number }[] = [];
  let consumed = 0;
  try {
    for (let i = 0; i < fireDates.length; i++) {
      const quoteId = picked[i]!;
      const identifier = `moeum-interval-g${generation}-${i}`;
      await scheduleQuoteNotification(
        identifier,
        truncateBody(bodyById.get(quoteId) ?? ''),
        fireDates[i]!,
        quoteId,
      );
      scheduled.push({ id: identifier, at: fireDates[i]!.getTime() });
      consumed++;
    }
    if (reminderDate) {
      const rid = `moeum-interval-g${generation}-reminder`;
      await scheduleReminderNotification(rid, reminderDate);
      scheduled.push({ id: rid, at: reminderDate.getTime() });
    }
  } finally {
    // 부분 실패 시에도 성공분만큼만 커서 커밋 (spec §1.2)
    queue = consumed === fireDates.length ? next : { ids: next.ids, cursor: Math.min(queue.cursor + consumed, next.ids.length) };
    await saveState({ generation, queue, scheduled });
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function debouncedSync(reason: 'integrity' | 'topup'): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void syncNotificationSchedule(reason);
  }, 5000);
}
