"use client";

import { useProgress } from "@/lib/store";
import { STATUS_LABEL, type Status } from "@/lib/progress";

const CHOICES: Status[] = ["learning", "done", "skip"];

const MARK: Record<string, string> = {
  learning: "var(--color-state-learning)",
  done: "var(--color-state-done)",
  skip: "var(--color-state-skip)",
};

/** Segmentli boshqaruv — bitta ramka ichida uch bo'lim, oraliq hairline. */
export function StatusToggle({ topicId }: { topicId: string }) {
  const current = useProgress((s) => s.progress[topicId]?.status ?? "none");
  const toggle = useProgress((s) => s.toggle);

  return (
    <div
      role="group"
      aria-label="Mavzu holati"
      className="inline-flex border border-[var(--color-line)]"
    >
      {CHOICES.map((choice, i) => {
        const active = current === choice;
        return (
          <button
            key={choice}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(topicId, choice)}
            className={
              "mono flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] transition-colors " +
              (i > 0 ? "border-l border-[var(--color-line-2)] " : "") +
              (active
                ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                : "text-[var(--color-ink-2)] hover:bg-[var(--color-paper-2)]")
            }
          >
            <span
              className="size-[7px] shrink-0"
              style={{ background: active ? "currentColor" : MARK[choice] }}
            />
            {STATUS_LABEL[choice]}
          </button>
        );
      })}
    </div>
  );
}
