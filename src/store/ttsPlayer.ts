import { create } from 'zustand';
import * as Speech from 'expo-speech';
import type { Quote } from '../types/quote';

type TtsPlayerState = {
  queue: Quote[];
  currentIndex: number;
  isPlaying: boolean;
  current: Quote | null;
  playList: (quotes: Quote[], startIndex?: number) => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  prev: () => void;
  stop: () => void;
};

const RATE = 1.0;
const PITCH = 1.0;

function speakNow(quote: Quote, onDone: () => void) {
  Speech.speak(quote.body, {
    language: 'ko-KR',
    rate: RATE,
    pitch: PITCH,
    onDone,
    onStopped: () => {
      // 정지는 외부 컨트롤이 처리
    },
    onError: onDone,
  });
}

function compute(queue: Quote[], idx: number): Quote | null {
  if (idx < 0 || idx >= queue.length) return null;
  return queue[idx];
}

export const useTtsPlayerStore = create<TtsPlayerState>((set, get) => {
  const speakAt = (idx: number) => {
    const { queue } = get();
    const item = compute(queue, idx);
    if (!item) {
      void Speech.stop();
      set({ isPlaying: false, currentIndex: -1, current: null });
      return;
    }
    set({ currentIndex: idx, current: item, isPlaying: true });
    speakNow(item, () => {
      const state = get();
      if (!state.isPlaying) return;
      if (state.currentIndex + 1 < state.queue.length) {
        speakAt(state.currentIndex + 1);
      } else {
        set({ isPlaying: false, current: null, currentIndex: -1, queue: [] });
      }
    });
  };

  return {
    queue: [],
    currentIndex: -1,
    isPlaying: false,
    current: null,

    playList: (quotes, startIndex = 0) => {
      if (quotes.length === 0) return;
      void Speech.stop();
      set({ queue: quotes });
      // setTimeout으로 Speech.stop이 완전히 끝난 후 새 재생 시작
      setTimeout(() => speakAt(startIndex), 50);
    },

    pause: () => {
      void Speech.stop();
      set({ isPlaying: false });
    },

    resume: () => {
      const { currentIndex, queue } = get();
      if (currentIndex < 0 || queue.length === 0) return;
      speakAt(currentIndex);
    },

    next: () => {
      const { currentIndex, queue } = get();
      void Speech.stop();
      if (currentIndex + 1 < queue.length) {
        setTimeout(() => speakAt(currentIndex + 1), 50);
      } else {
        set({ isPlaying: false, current: null, currentIndex: -1, queue: [] });
      }
    },

    prev: () => {
      const { currentIndex } = get();
      void Speech.stop();
      if (currentIndex > 0) {
        setTimeout(() => speakAt(currentIndex - 1), 50);
      }
    },

    stop: () => {
      void Speech.stop();
      set({ isPlaying: false, queue: [], currentIndex: -1, current: null });
    },
  };
});
