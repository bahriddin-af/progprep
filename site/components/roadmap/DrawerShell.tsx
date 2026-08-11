"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Faqat qobiq: ochish/yopish, focus trap, Esc, kenglik rejimi.
 * MAZMUN server komponentidan children sifatida keladi — u JS bundle'iga
 * tushmaydi.
 */
export function DrawerShell({
  title,
  stageNo,
  stageTitle,
  hot,
  closeHref,
  prevHref,
  nextHref,
  children,
}: {
  title: string;
  stageNo: string;
  stageTitle: string;
  hot?: boolean;
  closeHref: string;
  prevHref?: string;
  nextHref?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [narrow, setNarrow] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Intercepting route: back() ro'yxatga qaytaradi va tarixni ifloslantirmaydi.
  // To'g'ridan-to'g'ri kirilgan bo'lsa (tarix bo'sh) — havola bilan qaytamiz.
  const close = useCallback(() => {
    if (window.history.length > 1) router.back();
    else router.push(closeHref, { scroll: false });
  }, [router, closeHref]);

  useEffect(() => {
    closeRef.current?.focus();
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      // Focus trap — fokus panel ichida qoladi.
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previouslyFocused?.focus?.();
    };
  }, [title, close]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Yopish"
        tabIndex={-1}
        onClick={close}
        className="absolute inset-0 bg-black/45"
      />

      <div
        ref={panelRef}
        className={
          "relative flex h-full flex-col border-l-2 border-[var(--color-line)] bg-[var(--color-paper)] " +
          (narrow ? "w-full max-w-[920px]" : "w-full")
        }
      >
        <div className="shrink-0 border-b border-[var(--color-line)] px-6 py-4 sm:px-10">
          <div className="mx-auto flex w-full max-w-[880px] items-start gap-4">
            <div className="min-w-0 flex-1">
              <p className="mono truncate text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-3)]">
                {stageNo} · {stageTitle}
              </p>
              <h2 className="mt-1.5 flex items-start gap-2.5 text-balance text-[26px] font-bold leading-[1.15] tracking-[-0.02em]">
                {title}
                {hot && (
                  <span
                    title="Tez-tez so'raladi"
                    aria-label="Tez-tez so'raladi"
                    className="mt-[9px] size-2 shrink-0"
                    style={{ background: "var(--color-hot)" }}
                  />
                )}
              </h2>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => setNarrow((v) => !v)}
                aria-label={narrow ? "Kengaytirish" : "Toraytirish"}
                className="mono hidden border border-[var(--color-line-2)] px-2 py-1 text-[11px] text-[var(--color-ink-2)] hover:border-[var(--color-line)] hover:text-[var(--color-ink)] lg:block"
              >
                {narrow ? "wide" : "narrow"}
              </button>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                aria-label="Yopish"
                className="mono border border-[var(--color-line-2)] px-2.5 py-1 text-[11px] text-[var(--color-ink-2)] hover:border-[var(--color-line)] hover:text-[var(--color-ink)]"
              >
                esc
              </button>
            </div>
          </div>
        </div>

        {/* Markazlashtirilgan o'qish ustuni — matn ekran chetiga yopishmaydi. */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-8 sm:px-10">
          <div className="mx-auto w-full max-w-[880px] pb-28">{children}</div>
        </div>

        <div className="shrink-0 border-t border-[var(--color-line)] px-6 py-3 sm:px-10">
          <div className="mx-auto flex w-full max-w-[880px] items-center gap-2">
            <NavButton href={prevHref} label="← oldingi" />
            <NavButton href={nextHref} label="keyingi →" className="ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}

function NavButton({
  href,
  label,
  className = "",
}: {
  href?: string;
  label: string;
  className?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={!href}
      onClick={() => href && router.replace(href, { scroll: false })}
      className={
        "mono border border-[var(--color-line-2)] px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-[var(--color-ink-2)] hover:border-[var(--color-line)] hover:text-[var(--color-ink)] disabled:opacity-30 disabled:hover:border-[var(--color-line-2)] " +
        className
      }
    >
      {label}
    </button>
  );
}
