import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestPermission } from '../lib/notifications';

export type NotificationMode = 'daily' | 'interval';

type NotificationState = {
  enabled: boolean;
  mode: NotificationMode;
  hour: number;
  minute: number;
  intervalHours: 1 | 2 | 3 | 4;
  activeStartHour: number;
  activeEndHour: number;
  setEnabled: (enabled: boolean) => Promise<boolean>;
  setMode: (mode: NotificationMode) => Promise<void>;
  setTime: (hour: number, minute: number) => Promise<void>;
  setIntervalHours: (h: 1 | 2 | 3 | 4) => Promise<void>;
  setActiveWindow: (start: number, end: number) => Promise<void>;
};

// 순환 참조 회피 — scheduler는 이 store를 정적 import하므로 역방향은 동적 import
// 코얼레싱: 800ms 내 연속 호출은 마지막 한 번의 sync로 병합 (setter는 더 이상 완료를 기다리지 않음)
function requestIntegritySyncSoon(): void {
  void import('../lib/intervalScheduler').then((m) => m.debouncedSync('integrity', 800));
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      enabled: false,
      mode: 'daily',
      hour: 8,
      minute: 0,
      intervalHours: 1,
      activeStartHour: 8,
      activeEndHour: 22,

      setEnabled: async (enabled) => {
        if (enabled) {
          const granted = await requestPermission();
          if (!granted) {
            set({ enabled: false });
            requestIntegritySyncSoon();
            return false;
          }
        }
        set({ enabled });
        requestIntegritySyncSoon();
        return true;
      },

      setMode: async (mode) => {
        set({ mode });
        requestIntegritySyncSoon();
      },

      setTime: async (hour, minute) => {
        set({ hour, minute });
        requestIntegritySyncSoon();
      },

      setIntervalHours: async (h) => {
        set({ intervalHours: h });
        requestIntegritySyncSoon();
      },

      setActiveWindow: async (start, end) => {
        if (start >= end) return; // UI가 막지만 최종 방어
        set({ activeStartHour: start, activeEndHour: end });
        requestIntegritySyncSoon();
      },
    }),
    {
      name: 'moeum-notification',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<NotificationState>;
        if (version === 0) {
          return {
            ...p,
            mode: 'daily' as const,
            intervalHours: 1 as const,
            activeStartHour: 8,
            activeEndHour: 22,
          };
        }
        return p;
      },
    },
  ),
);

/** persist hydration 완료 대기 — scheduler 실행 전제 (spec §1.2) */
export function waitForNotificationHydration(): Promise<void> {
  if (useNotificationStore.persist.hasHydrated()) return Promise.resolve();
  const hydrationPromise = new Promise<void>((resolve) => {
    const unsub = useNotificationStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
  // 손상된 스토리지에서 무한 대기 방지 — 타임아웃 시 기본값으로 진행, 다음 sync가 수렴
  return Promise.race([hydrationPromise, new Promise<void>((r) => setTimeout(r, 3000))]);
}
