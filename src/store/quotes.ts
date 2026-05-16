import { create } from 'zustand';
import type { Quote, QuoteInput } from '../types/quote';
import * as db from '../db';
import type { FolderSelector } from './folders';

type QuotesState = {
  items: Quote[];
  search: string;
  folderId: FolderSelector;
  loading: boolean;
  setSearch: (s: string) => void;
  setFolder: (f: FolderSelector) => void;
  reload: () => Promise<void>;
  add: (input: QuoteInput, folderId?: number | null) => Promise<number>;
  update: (id: number, input: QuoteInput, folderId?: number | null | undefined) => Promise<void>;
  remove: (id: number) => Promise<void>;
  move: (id: number, folderId: number | null) => Promise<void>;
};

export const useQuotesStore = create<QuotesState>((set, get) => ({
  items: [],
  search: '',
  folderId: 'all',
  loading: false,

  setSearch: (s) => {
    set({ search: s });
    void get().reload();
  },

  setFolder: (f) => {
    set({ folderId: f });
    void get().reload();
  },

  reload: async () => {
    set({ loading: true });
    try {
      const items = await db.listQuotes({ search: get().search, folderId: get().folderId });
      set({ items });
    } finally {
      set({ loading: false });
    }
  },

  add: async (input, folderId) => {
    const id = await db.insertQuote(input, folderId);
    await get().reload();
    return id;
  },

  update: async (id, input, folderId) => {
    await db.updateQuote(id, input, folderId);
    await get().reload();
  },

  remove: async (id) => {
    await db.deleteQuote(id);
    await get().reload();
  },

  move: async (id, folderId) => {
    await db.moveQuoteToFolder(id, folderId);
    await get().reload();
  },
}));
