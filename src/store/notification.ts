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
async function requestIntegritySync(): Promise<void> {
  const m = await import('../lib/intervalScheduler');
  await m.syncNotificationSchedule('integrity');
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
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
            await requestIntegritySync();
            return false;
          }
        }
        set({ enabled });
        await requestIntegritySync();
        return true;
      },

      setMode: async (mode) => {
        set({ mode });
        await requestIntegritySync();
      },

      setTime: async (hour, minute) => {
        set({ hour, minute });
        await requestIntegritySync();
      },

      setIntervalHours: async (h) => {
        set({ intervalHours: h });
        await requestIntegritySync();
      },

      setActiveWindow: async (start, end) => {
        if (start >= end) return; // UI가 막지만 최종 방어
        set({ activeStartHour: start, activeEndHour: end });
        await requestIntegritySync();
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
  return new Promise((resolve) => {
    const unsub = useNotificationStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}
