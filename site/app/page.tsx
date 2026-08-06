import Link from "next/link";
import { roadmap, totals } from "@/lib/content";
import { TickMeter } from "@/components/roadmap/TickMeter";

export default function HomePage() {
  const t = totals(roadmap);

  const spec: [string, number][] = [
    ["bosqich", t.stages],
    ["mavzu", t.topics],
    ["savol", t.questions],
    ["tez-tez", t.hot],
  ];

  return (
    <div className="mx-auto max-w-[1200px] px-6">
      {/* Hero: chapda da'vo, o'ngda spetsifikatsiya bloki */}
      <section className="grid gap-10 border-b border-[var(--color-line)] py-16 lg:grid-cols-[1fr_300px] lg:gap-16 lg:py-24">
        <div>
          <h1 className="max-w-[15ch] text-balance text-[clamp(2.4rem,6vw,4.2rem)] font-bold leading-[0.98] tracking-[-0.035em]">
            Intervyuga tayyorgarlik
          </h1>

          <p className="mt-7 max-w-[52ch] text-[17px] leading-relaxed text-[var(--color-ink-2)]">
            Savol berilganda nima deyishni bilish uchun. Har mavzu chizma yoki kod
            bilan tushuntirilgan, tipik xatolar ajratib ko&apos;rsatilgan, oxirida
            savollar tayyor javob bilan berilgan.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href={`/roadmaps/${roadmap.slug}`}
              className="mono border border-[var(--color-line)] bg-[var(--color-ink)] px-6 py-3 text-[12px] uppercase tracking-[0.14em] text-[var(--color-paper)] hover:opacity-85"
            >
              Boshlash →
            </Link>
            <Link
              href="/progress"
              className="mono border border-[var(--color-line-2)] px-6 py-3 text-[12px] uppercase tracking-[0.14em] text-[var(--color-ink-2)] hover:border-[var(--color-line)] hover:text-[var(--color-ink)]"
            >
              Progress
            </Link>
          </div>
        </div>

        {/* Ma'lumot varaqasi — bezak emas, raqamlar */}
        <dl className="spec self-start">
          {spec.map(([label, value], i) => (
            <div
              key={label}
              className={
                "flex items-baseline justify-between px-4 py-3 " +
                (i > 0 ? "border-t border-[var(--color-line-2)]" : "")
              }
            >
              <dt className="mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-3)]">
                {label}
              </dt>
              <dd className="mono text-[22px] font-bold leading-none">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Bosqichlar — jadval qatorlari, karta emas */}
      <section className="py-14">
        <div className="flex items-baseline gap-4">
          <h2 className="label text-[var(--color-ink)]">Bosqichlar</h2>
          <span className="mono text-[11px] text-[var(--color-ink-3)]">
            01 — {String(t.stages).padStart(2, "0")}
          </span>
        </div>

        <ol className="mt-5 border-t border-[var(--color-line)]">
          {roadmap.stages.map((s) => (
            <li key={s.id} className="border-b border-[var(--color-line-2)]">
              <Link
                href={`/roadmaps/${roadmap.slug}#${s.slug}`}
                className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3.5 hover:bg-[var(--color-paper-2)]"
              >
                <span className="mono w-7 shrink-0 text-[12px] text-[var(--color-ink-3)]">
                  {String(s.order).padStart(2, "0")}
                </span>
                <span className="text-[15px] font-semibold tracking-[-0.01em]">
                  {s.title}
                </span>
                <span className="mono hidden text-[11px] text-[var(--color-ink-3)] md:block">
                  {s.topics.length} mavzu
                </span>
                <span className="ml-auto shrink-0 pr-1">
                  <TickMeter topicIds={s.topics.map((x) => x.id)} height={12} />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
