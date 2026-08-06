"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

/** Logotiplar inline — tashqi so'rov ham, rasm fayli ham bo'lmasin. */
function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-[17px] fill-current">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden className="size-[17px]">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

export function AuthModal({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = useState<"github" | "google" | "email" | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    // Orqa fon aylanmasin — modal ustida ish ketyapti.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  async function signIn(provider: "github" | "google") {
    const db = supabase();
    if (!db) return;
    setBusy(provider);
    setError(null);
    const { error } = await db.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.href },
    });
    if (error) {
      setBusy(null);
      // Supabase'da provayder yoqilmagan bo'lsa aynan shu yerga tushadi.
      setError(
        `${provider === "github" ? "GitHub" : "Google"} hozircha ulanmagan. Email bilan kiring yoki Supabase'da provayderni yoqing.`,
      );
    }
  }

  async function signInWithEmail(email: string) {
    const db = supabase();
    if (!db) return;
    setBusy("email");
    setError(null);
    const { error } = await db.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    });
    setBusy(null);
    if (error) setError(error.message);
    else setSent(email);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Kirish"
      onMouseDown={(e) => {
        if (!card.current?.contains(e.target as Node)) onClose();
      }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "color-mix(in srgb, var(--color-ink) 45%, transparent)" }}
      />

      <div
        ref={card}
        className="relative w-full max-w-[400px] border border-[var(--color-line)] bg-[var(--color-paper)] p-6"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Yopish"
          className="mono absolute right-3 top-3 size-6 text-[14px] leading-none text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
        >
          ×
        </button>

        {sent ? (
          <>
            <p className="label">Havola yuborildi</p>
            <p className="mt-3 text-[14px] leading-relaxed">
              <b className="font-semibold">{sent}</b> manziliga kirish havolasi
              ketdi.
            </p>
            <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--color-ink-3)]">
              Pochtangizni oching va havolani bosing — shu sahifaga qaytasiz.
              Xat ko&apos;rinmasa, spam papkasini tekshiring.
            </p>
            <button
              type="button"
              onClick={() => setSent(null)}
              className="mono mt-5 text-[10px] uppercase tracking-[0.12em] text-[var(--color-ink-3)] underline underline-offset-4 hover:text-[var(--color-ink)]"
            >
              Boshqa manzil bilan
            </button>
          </>
        ) : (
          <>
            <p className="label">Kirish</p>
            <h2 className="mt-2 text-[22px] font-bold tracking-[-0.02em]">
              Progressni saqlab qo&apos;ying
            </h2>
            <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--color-ink-2)]">
              Alohida ro&apos;yxatdan o&apos;tish yo&apos;q — birinchi
              kirishning o&apos;zi hisob ochadi. Belgilashlaringiz boshqa
              qurilmada ham ochiladi.
            </p>

            <div className="mt-5 space-y-2">
              <ProviderButton
                onClick={() => signIn("github")}
                disabled={busy !== null}
                loading={busy === "github"}
                icon={<GitHubMark />}
                label="GitHub bilan davom etish"
              />
              <ProviderButton
                onClick={() => signIn("google")}
                disabled={busy !== null}
                loading={busy === "google"}
                icon={<GoogleMark />}
                label="Google bilan davom etish"
              />
            </div>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-[var(--color-line-2)]" />
              <span className="mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--color-ink-3)]">
                yoki pochta bilan
              </span>
              <span className="h-px flex-1 bg-[var(--color-line-2)]" />
            </div>

            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const value = new FormData(e.currentTarget).get("email");
                if (typeof value === "string" && value) void signInWithEmail(value);
              }}
            >
              <input
                name="email"
                type="email"
                required
                placeholder="pochta@gmail.com"
                className="min-w-0 flex-1 border border-[var(--color-line-2)] bg-transparent px-3 py-2 text-[13px] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-ink)] focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy !== null}
                className="mono shrink-0 border border-[var(--color-line)] px-3 text-[10px] uppercase tracking-[0.12em] hover:bg-[var(--color-paper-2)] disabled:opacity-50"
              >
                {busy === "email" ? "…" : "Yuborish"}
              </button>
            </form>

            {error && (
              <p
                className="mt-3 border-l-2 pl-3 text-[12px] leading-relaxed"
                style={{ borderColor: "var(--color-hot)", color: "var(--color-ink-2)" }}
              >
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ProviderButton({
  onClick,
  disabled,
  loading,
  icon,
  label,
}: {
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 border border-[var(--color-line-2)] px-4 py-3 text-[13.5px] font-medium hover:border-[var(--color-ink)] hover:bg-[var(--color-paper-2)] disabled:opacity-50"
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {loading && (
        <span className="mono text-[10px] text-[var(--color-ink-3)]">…</span>
      )}
    </button>
  );
}
