import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleDaily, cancelDaily, requestPermission } from '../lib/notifications';

type NotificationState = {
  enabled: boolean;
  hour: number;
  minute: number;
  setEnabled: (enabled: boolean) => Promise<boolean>;
  setTime: (hour: number, minute: number) => Promise<void>;
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      enabled: false,
      hour: 8,
      minute: 0,

      setEnabled: async (enabled) => {
        if (enabled) {
          const granted = await requestPermission();
          if (!granted) {
            set({ enabled: false });
            return false;
          }
          await scheduleDaily(get().hour, get().minute);
        } else {
          await cancelDaily();
        }
        set({ enabled });
        return true;
      },

      setTime: async (hour, minute) => {
        set({ hour, minute });
        if (get().enabled) {
          await scheduleDaily(hour, minute);
        }
      },
    }),
    {
      name: 'moeum-notification',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
