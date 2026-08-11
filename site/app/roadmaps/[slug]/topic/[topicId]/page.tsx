// To'g'ridan-to'g'ri kirilganda (havola ulashilgan, refresh) — to'liq sahifa.
import Link from "next/link";
import { TopicBody } from "@/components/roadmap/TopicDrawer";
import { allTopicParams, resolveTopic } from "../../topicShared";

export function generateStaticParams() {
  return allTopicParams();
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string; topicId: string }>;
}) {
  const { slug, topicId } = await params;
  const { stage, topic, basePath, prevHref, nextHref, locked } = resolveTopic(
    slug,
    topicId,
  );

  return (
    <div className="mx-auto max-w-[720px] px-6 py-10 sm:px-10">
      <Link
        href={basePath}
        className="mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-3)] underline-offset-4 hover:text-[var(--color-ink)] hover:underline"
      >
        ← {String(stage.order).padStart(2, "0")} · {stage.title}
      </Link>

      <h1 className="mt-4 flex items-start gap-2.5 text-balance text-[clamp(1.7rem,4vw,2.3rem)] font-bold leading-[1.1] tracking-[-0.03em]">
        {topic.title}
        {topic.hot && (
          <span
            title="Tez-tez so'raladi"
            aria-label="Tez-tez so'raladi"
            className="mt-[11px] size-2 shrink-0"
            style={{ background: "var(--color-hot)" }}
          />
        )}
      </h1>

      <div className="mt-6 border-t border-[var(--color-line)] pt-6">
        <TopicBody topic={topic} locked={locked} />
      </div>

      <nav className="mt-16 flex gap-2 border-t border-[var(--color-line)] pt-4">
        {prevHref && (
          <Link
            href={prevHref}
            className="mono border border-[var(--color-line-2)] px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-[var(--color-ink-2)] hover:border-[var(--color-line)] hover:text-[var(--color-ink)]"
          >
            ← oldingi
          </Link>
        )}
        {nextHref && (
          <Link
            href={nextHref}
            className="mono ml-auto border border-[var(--color-line-2)] px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-[var(--color-ink-2)] hover:border-[var(--color-line)] hover:text-[var(--color-ink)]"
          >
            keyingi →
          </Link>
        )}
      </nav>
    </div>
  );
}
