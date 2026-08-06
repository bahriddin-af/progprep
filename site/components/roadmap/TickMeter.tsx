"use client";

import { useProgress } from "@/lib/store";
import { statusOf, STATUS_LABEL, type Status } from "@/lib/progress";

const FILL: Record<Status, string> = {
  none: "var(--color-line-2)",
  learning: "var(--color-state-learning)",
  done: "var(--color-state-done)",
  skip: "var(--color-state-skip)",
};

/**
 * Foiz chizig'i emas — MAVZU BOSHIGA BITTA TIK.
 *
 * Foiz "60%" deydi va shu bilan tugaydi. Tik o'lchagich nechta mavzu borligini,
 * qaysilari tugaganini va qaysilari jarayonda ekanini bir qarashda ko'rsatadi.
 * Ya'ni shakl ma'lumot tashiydi, bezak emas.
 */
export function TickMeter({
  topicIds,
  height = 14,
}: {
  topicIds: string[];
  height?: number;
}) {
  const progress = useProgress((s) => s.progress);
  const done = topicIds.filter((id) => {
    const s = statusOf(progress, id);
    return s === "done" || s === "skip";
  }).length;

  return (
    <div className="flex items-center gap-2.5">
      <div
        className="flex gap-[2px]"
        role="img"
        aria-label={`${topicIds.length} mavzudan ${done} tasi yopilgan`}
      >
        {topicIds.map((id) => {
          const status = statusOf(progress, id);
          return (
            <span
              key={id}
              title={STATUS_LABEL[status]}
              className="w-[3px] shrink-0"
              style={{ height, background: FILL[status] }}
            />
          );
        })}
      </div>
      <span className="mono shrink-0 text-[11px] text-[var(--color-ink-3)]">
        {done}/{topicIds.length}
      </span>
    </div>
  );
}
