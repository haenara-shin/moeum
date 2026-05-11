import { create } from 'zustand';
import type { Quote, QuoteInput } from '../types/quote';
import * as db from '../db';

type QuotesState = {
  items: Quote[];
  search: string;
  loading: boolean;
  setSearch: (s: string) => void;
  reload: () => Promise<void>;
  add: (input: QuoteInput) => Promise<number>;
  update: (id: number, input: QuoteInput) => Promise<void>;
  remove: (id: number) => Promise<void>;
};

export const useQuotesStore = create<QuotesState>((set, get) => ({
  items: [],
  search: '',
  loading: false,

  setSearch: (s) => {
    set({ search: s });
    void get().reload();
  },

  reload: async () => {
    set({ loading: true });
    try {
      const items = await db.listQuotes({ search: get().search });
      set({ items });
    } finally {
      set({ loading: false });
    }
  },

  add: async (input) => {
    const id = await db.insertQuote(input);
    await get().reload();
    return id;
  },

  update: async (id, input) => {
    await db.updateQuote(id, input);
    await get().reload();
  },

  remove: async (id) => {
    await db.deleteQuote(id);
    await get().reload();
  },
}));
