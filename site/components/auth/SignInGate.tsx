"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { authEnabled } from "@/lib/supabase";
import { AuthModal } from "./AuthModal";
import { FREE_TOPIC_COUNT } from "@/lib/access";

/** Qulf belgisi — tugun burchagida. */
export function LockMark() {
  return (
    <svg viewBox="0 0 10 12" aria-hidden className="size-[11px] fill-current">
      <path d="M2 5V3.5a3 3 0 1 1 6 0V5h.5a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5v-6a.5.5 0 0 1 .5-.5H2Zm1 0h4V3.5a2 2 0 1 0-4 0V5Z" />
    </svg>
  );
}

/**
 * Qulflangan mavzu tuguni: havola emas, tugma. Bosilsa kirish oynasi
 * ochiladi — foydalanuvchi bo'sh sahifaga urilib qolmaydi.
 */
export function LockedNode({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`${title} — kirish talab qilinadi`}
        aria-label={`${title} — kirish talab qilinadi`}
        className={className}
      >
        {children}
      </button>
      {open && <AuthModal onClose={() => setOpen(false)} />}
    </>
  );
}

/**
 * Mazmun o'rniga qo'yiladigan quti. Nima ochiq, nima yopiqligini aytadi
 * va darhol kirish imkonini beradi.
 */
export function LockedContent({ topicTitle }: { topicTitle: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="spec mt-8 max-w-[520px] p-6">
      <p className="label flex items-center gap-2">
        <LockMark />
        Yopiq mavzu
      </p>
      <h3 className="mt-3 text-[19px] font-bold tracking-[-0.02em]">
        {topicTitle} — kirish talab qilinadi
      </h3>
      <p className="mt-3 text-[13px] leading-relaxed text-[var(--color-ink-2)]">
        Birinchi {FREE_TOPIC_COUNT} mavzu hammaga ochiq. Qolgan darslar,
        intervyu savollari va javoblari uchun hisobingizga kiring —
        belgilashlaringiz ham o&apos;shanda saqlanadi.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mono border border-[var(--color-line)] bg-[var(--color-ink)] px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-[var(--color-paper)]"
        >
          Kirish / ro&apos;yxatdan o&apos;tish
        </button>
        <Link
          href="/roadmaps/dotnet-backend"
          className="mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-ink-3)] underline underline-offset-4 hover:text-[var(--color-ink)]"
        >
          Xaritaga qaytish
        </Link>
      </div>

      <p className="mt-5 border-t border-[var(--color-line-2)] pt-3 text-[11.5px] leading-relaxed text-[var(--color-ink-3)]">
        Bir necha soniya: GitHub yoki Google hisobingiz bilan, parolsiz.
      </p>

      {open && <AuthModal onClose={() => setOpen(false)} />}
    </div>
  );
}

/**
 * Mazmunni qulf ortiga oladi. Kirgan bo'lsa yoki mavzu ochiq bo'lsa,
 * bolalarni o'zgarishsiz ko'rsatadi.
 */
export function TopicGate({
  locked,
  topicTitle,
  children,
}: {
  locked: boolean;
  topicTitle: string;
  children: React.ReactNode;
}) {
  const user = useAuth((s) => s.user);
  const ready = useAuth((s) => s.ready);

  // Sozlanmagan bo'lsa qulf ham yo'q — sayt oddiy holicha ishlaydi.
  if (!authEnabled || !locked || user) return <>{children}</>;

  // Sessiya tekshirilgunicha mazmun ham, qulf ham ko'rsatilmaydi —
  // kirgan odam qulfning bir zumlik chaqnashini ko'rmasin.
  if (!ready) return <div className="mt-8 h-[220px]" aria-hidden />;

  return <LockedContent topicTitle={topicTitle} />;
}
