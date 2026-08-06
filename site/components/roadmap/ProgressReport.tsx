"use client";

import Link from "next/link";
import { useProgress } from "@/lib/store";
import { completionPercent, countByStatus } from "@/lib/progress";
import { TickMeter } from "./TickMeter";

type StageInfo = {
  id: string;
  order: number;
  title: string;
  slug: string;
  topicIds: string[];
};

const LEGEND: [string, string][] = [
  ["tugatildi", "var(--color-state-done)"],
  ["jarayonda", "var(--color-state-learning)"],
  ["o'tkazildi", "var(--color-state-skip)"],
  ["boshlanmagan", "var(--color-line-2)"],
];

export function ProgressReport({
  stages,
  slug,
}: {
  stages: StageInfo[];
  slug: string;
}) {
  const progress = useProgress((s) => s.progress);
  const reset = useProgress((s) => s.reset);

  const all = stages.flatMap((s) => s.topicIds);
  const counts = countByStatus(progress, all);
  const overall = completionPercent(progress, all);

  return (
    <div>
      {/* Yakuniy ko'rsatkich — katta raqam va to'liq tik o'lchagich */}
      <div className="spec">
        <div className="flex flex-wrap items-end justify-between gap-6 p-5">
          <div>
            <p className="label">Yopilgan</p>
            <p className="mono mt-1 text-[52px] font-bold leading-none tracking-[-0.03em]">
              {overall}
              <span className="text-[24px] text-[var(--color-ink-3)]">%</span>
            </p>
          </div>

          <dl className="flex gap-6">
            {[
              ["tugatildi", counts.done],
              ["jarayonda", counts.learning],
              ["o'tkazildi", counts.skip],
              ["jami", all.length],
            ].map(([k, v]) => (
              <div key={k as string}>
                <dt className="mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-ink-3)]">
                  {k}
                </dt>
                <dd className="mono mt-1 text-[18px] font-bold">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="overflow-x-auto border-t border-[var(--color-line-2)] p-5">
          <TickMeter topicIds={all} height={22} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        {LEGEND.map(([label, color]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="h-[3px] w-4" style={{ background: color }} />
            <span className="mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-ink-3)]">
              {label}
            </span>
          </span>
        ))}
      </div>

      <ol className="mt-10 border-t border-[var(--color-line)]">
        {stages.map((s) => (
          <li key={s.id} className="border-b border-[var(--color-line-2)]">
            <Link
              href={`/roadmaps/${slug}#${s.slug}`}
              className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3.5 hover:bg-[var(--color-paper-2)]"
            >
              <span className="mono w-7 shrink-0 text-[12px] text-[var(--color-ink-3)]">
                {String(s.order).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">
                {s.title}
              </span>
              <span className="shrink-0">
                <TickMeter topicIds={s.topicIds} height={12} />
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={() => {
          if (confirm("Butun progress o'chirilsinmi?")) reset();
        }}
        className="mono mt-10 border border-[var(--color-line-2)] px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-[var(--color-ink-2)] hover:border-[var(--color-hot)] hover:text-[var(--color-hot)]"
      >
        Progressni tozalash
      </button>
    </div>
  );
}
