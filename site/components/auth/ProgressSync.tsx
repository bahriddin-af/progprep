"use client";

import { useEffect, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, authEnabled } from "@/lib/supabase";
import { useAuth, type AuthUser } from "@/lib/auth";
import { useProgress } from "@/lib/store";
import { mergeProgress, type ProgressMap } from "@/lib/progress";

/** Yozishni kechiktirish — har bosishda so'rov yuborilmasin. */
const DEBOUNCE_MS = 900;

function toAuthUser(u: User): AuthUser {
  const m = u.user_metadata ?? {};
  return {
    id: u.id,
    email: u.email ?? null,
    name: (m.full_name as string) ?? (m.name as string) ?? null,
    avatar: (m.avatar_url as string) ?? (m.picture as string) ?? null,
  };
}

/**
 * Ko'rinmaydigan komponent: sessiyani kuzatadi va progressni Supabase bilan
 * ikki tomonlama sinxronlaydi.
 *
 * Nega birlashtirish kerak: telefonda va noutbukda alohida belgilangan
 * bo'lishi mumkin. `mergeProgress` har mavzu uchun `updatedAt` bo'yicha
 * yangirog'ini oladi — biri ikkinchisini o'chirib yubormaydi.
 */
export function ProgressSync() {
  const setUser = useAuth((s) => s.setUser);
  const setReady = useAuth((s) => s.setReady);
  const setSync = useAuth((s) => s.setSync);

  // Sinxronizatsiya tugagunicha yozuvni bloklaydi — aks holda bo'sh
  // lokal holat serverdagi ma'lumot ustiga yozilib ketardi.
  const primed = useRef(false);
  const userId = useRef<string | null>(null);

  useEffect(() => {
    const db = supabase();
    if (!db) {
      setReady(true);
      return;
    }

    async function pull(user: User) {
      userId.current = user.id;
      setUser(toAuthUser(user));
      setSync("syncing");

      const { data, error } = await db!
        .from("progress")
        .select("data")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        setSync("error");
        console.error("Progressni o'qib bo'lmadi:", error.message);
        return;
      }

      const remote = (data?.data ?? {}) as ProgressMap;
      const local = useProgress.getState().progress;
      const merged = mergeProgress(remote, local);

      useProgress.getState().replace(merged);
      primed.current = true;

      // Birlashtirilgan holatni darhol qaytarib yozamiz — server ham,
      // brauzer ham bir xil rasmni ko'rsin.
      await push(user.id, merged);
    }

    async function push(id: string, progress: ProgressMap) {
      setSync("syncing");
      const { error } = await db!
        .from("progress")
        .upsert(
          { user_id: id, data: progress, updated_at: new Date().toISOString() },
          { onConflict: "user_id" },
        );
      setSync(error ? "error" : "saved");
      if (error) console.error("Progressni saqlab bo'lmadi:", error.message);
    }

    let timer: ReturnType<typeof setTimeout> | undefined;

    const unsubscribeStore = useProgress.subscribe((state, previous) => {
      if (!primed.current || !userId.current) return;
      if (state.progress === previous.progress) return;
      clearTimeout(timer);
      const id = userId.current;
      const snapshot = state.progress;
      timer = setTimeout(() => void push(id, snapshot), DEBOUNCE_MS);
    });

    const { data: sub } = db.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // TOKEN_REFRESHED har soatda keladi — qayta tortish shart emas.
        if (event === "TOKEN_REFRESHED" && primed.current) return;
        void pull(session.user);
      } else {
        primed.current = false;
        userId.current = null;
        setUser(null);
        setSync("idle");
      }
      setReady(true);
    });

    // Sahifa ochilganda mavjud sessiyani tekshirish.
    void db.auth.getSession().then(({ data }) => {
      if (!data.session) setReady(true);
    });

    return () => {
      clearTimeout(timer);
      unsubscribeStore();
      sub.subscription.unsubscribe();
    };
  }, [setReady, setSync, setUser]);

  if (!authEnabled) return null;
  return null;
}
