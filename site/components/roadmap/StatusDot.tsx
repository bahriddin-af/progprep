"use client";

import { useProgress } from "@/lib/store";
import { STATUS_LABEL, STATUS_ORDER, type Status } from "@/lib/progress";

const COLOR: Record<Status, string> = {
  none: "transparent",
  learning: "var(--color-state-learning)",
  done: "var(--color-state-done)",
  skip: "var(--color-state-skip)",
};

/** Belgi shakli ham farq qiladi — faqat rangga tayanmaydi. */
const GLYPH: Record<Status, string> = {
  none: "",
  learning: "~",
  done: "✓",
  skip: "×",
};

function next(status: Status): Status {
  return STATUS_ORDER[(STATUS_ORDER.indexOf(status) + 1) % STATUS_ORDER.length];
}

/**
 * Tugun burchagidagi holat belgisi. Bosilganda holat aylanadi —
 * xaritadan chiqmasdan belgilash uchun.
 */
export function StatusDot({ topicId, title }: { topicId: string; title: string }) {
  const status = useProgress((s) => s.progress[topicId]?.status ?? "none");
  const set = useProgress((s) => s.set);

  return (
    <button
      type="button"
      onClick={() => set(topicId, next(status))}
      aria-label={`${title} — holat: ${STATUS_LABEL[status]}`}
      title={STATUS_LABEL[status]}
      className="mono flex size-[18px] items-center justify-center border border-[var(--color-line-2)] bg-[var(--color-paper)] text-[10px] leading-none text-[var(--color-paper)] transition-colors hover:border-[var(--color-ink)]"
      style={
        status === "none"
          ? undefined
          : { background: COLOR[status], borderColor: COLOR[status] }
      }
    >
      {GLYPH[status]}
    </button>
  );
}
