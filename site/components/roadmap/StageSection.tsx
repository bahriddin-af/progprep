import type { Stage } from "@/content/schema";
import { TopicNode } from "./TopicNode";
import { TickMeter } from "./TickMeter";

export function StageSection({
  stage,
  basePath,
}: {
  stage: Stage;
  basePath: string;
}) {
  const topicIds = stage.topics.map((t) => t.id);
  const num = String(stage.order).padStart(2, "0");

  return (
    <section id={stage.slug} className="scroll-mt-16">
      {/* Sarlavha qatori — spetsifikatsiya varaqasining bo'lim boshi */}
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 border-b border-[var(--color-line)] pb-2">
        <span className="mono text-[11px] text-[var(--color-ink-3)]">
          {num} / 15
        </span>
        <h2 className="text-[19px] font-bold tracking-[-0.015em]">{stage.title}</h2>
        <div className="ml-auto flex items-center gap-4">
          <TickMeter topicIds={topicIds} />
        </div>
      </div>

      {stage.subtitle && (
        <p className="mt-3 max-w-[70ch] text-[13.5px] leading-relaxed text-[var(--color-ink-2)]">
          {stage.subtitle}
        </p>
      )}

      {/* Hairline to'r — 1px oraliq, suzuvchi karta emas */}
      <div className="hairgrid mt-4 sm:grid-cols-2 lg:grid-cols-3">
        {stage.topics.map((topic, i) => (
          <TopicNode
            key={topic.id}
            topic={topic}
            index={`${num}.${String(i + 1).padStart(2, "0")}`}
            href={`${basePath}/topic/${topic.id}`}
          />
        ))}
      </div>
    </section>
  );
}
