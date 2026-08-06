"use client";

import { create } from "zustand";

export type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatar: string | null;
};

export type SyncState = "idle" | "syncing" | "saved" | "error";

type AuthStore = {
  user: AuthUser | null;
  /** Sessiya birinchi marta tekshirilgunicha UI tugma ko'rsatmaydi. */
  ready: boolean;
  sync: SyncState;
  setUser: (user: AuthUser | null) => void;
  setReady: (ready: boolean) => void;
  setSync: (sync: SyncState) => void;
};

export const useAuth = create<AuthStore>((set) => ({
  user: null,
  ready: false,
  sync: "idle",
  setUser: (user) => set({ user }),
  setReady: (ready) => set({ ready }),
  setSync: (sync) => set({ sync }),
}));
