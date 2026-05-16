import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as db from '../db';
import type { Folder, FolderInput } from '../types/folder';

export type FolderSelector = number | null | 'all';

type FoldersState = {
  folders: Folder[];
  current: FolderSelector;
  loading: boolean;
  reload: () => Promise<void>;
  setCurrent: (sel: FolderSelector) => void;
  add: (input: FolderInput) => Promise<number>;
  rename: (id: number, name: string) => Promise<void>;
  remove: (id: number) => Promise<void>;
};

export const useFoldersStore = create<FoldersState>()(
  persist(
    (set, get) => ({
      folders: [],
      current: 'all',
      loading: false,

      reload: async () => {
        set({ loading: true });
        try {
          const folders = await db.listFolders();
          set({ folders });
        } finally {
          set({ loading: false });
        }
      },

      setCurrent: (sel) => set({ current: sel }),

      add: async (input) => {
        const id = await db.insertFolder(input);
        await get().reload();
        return id;
      },

      rename: async (id, name) => {
        await db.renameFolder(id, name);
        await get().reload();
      },

      remove: async (id) => {
        await db.deleteFolder(id);
        if (get().current === id) set({ current: 'all' });
        await get().reload();
      },
    }),
    {
      name: 'moeum-folders',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ current: state.current }),
    },
  ),
);
