"use client";

import { useEffect, useRef, useState } from "react";
import { supabase, authEnabled } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { AuthModal } from "./AuthModal";

const SYNC_LABEL: Record<string, string> = {
  syncing: "saqlanmoqda…",
  saved: "saqlandi",
  error: "saqlanmadi",
};

/** Kirish tugmasi va hisob menyusi. Sozlamalar bo'lmasa chizilmaydi. */
export function AuthButton() {
  const user = useAuth((s) => s.user);
  const ready = useAuth((s) => s.ready);
  const sync = useAuth((s) => s.sync);
  const [modal, setModal] = useState(false);
  const [menu, setMenu] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    function onDown(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) setMenu(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenu(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  // Kirgandan keyin modal ochiq qolmasin.
  useEffect(() => {
    if (user) setModal(false);
  }, [user]);

  if (!authEnabled) return null;

  // Sessiya tekshirilgunicha joyni band qilib turadi — chayqalish bo'lmasin.
  if (!ready) return <div className="h-[26px] w-[70px]" aria-hidden />;

  async function signOut() {
    const db = supabase();
    if (!db) return;
    setMenu(false);
    await db.auth.signOut();
  }

  if (user) {
    const label = user.name ?? user.email ?? "Hisob";
    return (
      <div ref={box} className="relative flex items-center gap-2.5">
        {sync !== "idle" && (
          <span
            className="mono hidden text-[10px] uppercase tracking-[0.12em] text-[var(--color-ink-3)] sm:inline"
            style={sync === "error" ? { color: "var(--color-hot)" } : undefined}
          >
            {SYNC_LABEL[sync]}
          </span>
        )}
        <button
          type="button"
          onClick={() => setMenu((v) => !v)}
          aria-expanded={menu}
          className="mono flex items-center gap-2 border border-[var(--color-line-2)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--color-ink-2)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
        >
          {user.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar} alt="" className="size-[14px]" />
          ) : (
            <span
              className="size-[14px]"
              style={{ background: "var(--color-state-done)" }}
            />
          )}
          <span className="max-w-[110px] truncate normal-case tracking-normal">
            {label}
          </span>
        </button>

        {menu && (
          <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[220px] border border-[var(--color-line)] bg-[var(--color-paper)] p-3">
            <p className="mono truncate text-[11px] text-[var(--color-ink-3)]">
              {user.email ?? user.id}
            </p>
            <p className="mt-2 text-[11.5px] leading-relaxed text-[var(--color-ink-2)]">
              Progress hisobingizga saqlanmoqda — boshqa qurilmada ham
              ko&apos;rinadi.
            </p>
            <button
              type="button"
              onClick={signOut}
              className="mono mt-3 w-full border border-[var(--color-line-2)] px-2 py-1.5 text-[10px] uppercase tracking-[0.12em] text-[var(--color-ink-2)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
            >
              Chiqish
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModal(true)}
        className="mono border border-[var(--color-line-2)] px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--color-ink-2)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
      >
        Kirish
      </button>
      {modal && <AuthModal onClose={() => setModal(false)} />}
    </>
  );
}
