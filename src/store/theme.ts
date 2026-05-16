import { Appearance, type ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ThemePreference = 'system' | 'light' | 'dark';

type ThemeState = {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: 'system',
      setPreference: (preference) => {
        set({ preference });
        Appearance.setColorScheme(preference === 'system' ? null : preference);
      },
    }),
    {
      name: 'moeum-theme',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        Appearance.setColorScheme(state.preference === 'system' ? null : state.preference);
      },
    },
  ),
);

export function resolveScheme(pref: ThemePreference, system: ColorSchemeName): 'light' | 'dark' {
  if (pref === 'system') return system === 'dark' ? 'dark' : 'light';
  return pref;
}
