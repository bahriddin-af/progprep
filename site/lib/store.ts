"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  toggleStatus,
  setStatus,
  statusOf,
  type ProgressMap,
  type Status,
} from "./progress";

type ProgressState = {
  progress: ProgressMap;
  hydrated: boolean;
  toggle: (topicId: string, status: Status) => void;
  set: (topicId: string, status: Status) => void;
  get: (topicId: string) => Status;
  /** Serverdan kelgan holatni to'liq almashtiradi — sinxronizatsiya uchun. */
  replace: (progress: ProgressMap) => void;
  reset: () => void;
};

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      progress: {},
      hydrated: false,

      // UI darhol yangilanadi — tarmoq kutilmaydi.
      toggle: (topicId, status) =>
        set((s) => ({ progress: toggleStatus(s.progress, topicId, status) })),

      set: (topicId, status) =>
        set((s) => ({ progress: setStatus(s.progress, topicId, status) })),

      get: (topicId) => statusOf(get().progress, topicId),

      replace: (progress) => set({ progress }),

      reset: () => set({ progress: {} }),
    }),
    {
      name: "ip-progress-v1",
      partialize: (s) => ({ progress: s.progress }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);
