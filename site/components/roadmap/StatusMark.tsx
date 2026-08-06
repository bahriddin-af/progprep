"use client";

import { useProgress } from "@/lib/store";
import { STATUS_LABEL, type Status } from "@/lib/progress";

const COLOR: Record<Status, string> = {
  none: "var(--color-line-2)",
  learning: "var(--color-state-learning)",
  done: "var(--color-state-done)",
  skip: "var(--color-state-skip)",
};

/** Holat matn bilan ham beriladi — faqat rangga tayanmaydi. */
export function StatusMark({ topicId }: { topicId: string }) {
  const status = useProgress((s) => s.progress[topicId]?.status ?? "none");

  return (
    <span className="flex items-center gap-1.5">
      <span className="h-[3px] w-4 shrink-0" style={{ background: COLOR[status] }} />
      <span className="mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-ink-3)]">
        {status === "none" ? "—" : STATUS_LABEL[status]}
      </span>
    </span>
  );
}
