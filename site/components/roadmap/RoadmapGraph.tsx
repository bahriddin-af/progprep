import type { Stage, Topic } from "@/content/schema";
import { buildSpine, type SpineNode } from "@/lib/graph";
import { freeTopicIds } from "@/lib/access";
import { TopicLink } from "./TopicLink";
import { LockMark } from "@/components/auth/SignInGate";
import { StatusDot } from "./StatusDot";
import { TickMeter } from "./TickMeter";

/**
 * Sxematik xarita: markazda bosqichlar magistrali, ikki yonida mavzu tarmoqlari.
 * Joylashuv `lib/graph.ts`da hisoblanadi — bu yerda faqat chizish.
 */
export function RoadmapGraph({
  stages,
  basePath,
}: {
  stages: Stage[];
  basePath: string;
}) {
  const spine = buildSpine(stages.map((s) => ({ id: s.id, topics: s.topics })));
  const free = new Set(freeTopicIds(stages));

  const stageById = new Map(stages.map((s) => [s.id, s]));
  const topicById = new Map<string, { topic: Topic; stage: Stage; index: number }>();
  for (const stage of stages) {
    stage.topics.forEach((topic, i) => topicById.set(topic.id, { topic, stage, index: i }));
  }

  const nodeStyle = (n: SpineNode) => ({
    left: n.x,
    top: n.y,
    width: n.w,
    height: n.h,
  });

  return (
    <div className="overflow-x-auto pb-4">
      <div
        className="relative mx-auto"
        style={{ width: spine.width, height: spine.height }}
      >
        {/* Chiziqlar — tugunlar ostida, sichqonchani ushlamaydi */}
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0"
          width={spine.width}
          height={spine.height}
        >
          {spine.edges.map((e) => (
            <path
              key={e.id}
              d={e.d}
              fill="none"
              stroke={
                e.kind === "spine" ? "var(--color-ink)" : "var(--color-line-2)"
              }
              strokeWidth={e.kind === "spine" ? 1.5 : 1}
              strokeDasharray={e.kind === "spine" ? undefined : "2 4"}
            />
          ))}
        </svg>

        {spine.nodes.map((n) => {
          if (n.kind === "stage") {
            const stage = stageById.get(n.id);
            if (!stage) return null;
            return (
              <div
                key={n.id}
                id={stage.slug}
                className="absolute flex scroll-mt-16 items-center gap-3.5 border border-[var(--color-line)] bg-[var(--color-paper-2)] px-5"
                style={nodeStyle(n)}
              >
                <span className="mono shrink-0 text-[12px] text-[var(--color-ink-3)]">
                  {String(stage.order).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 truncate text-[16px] font-bold tracking-[-0.015em]">
                  {stage.title}
                </span>
                <TickMeter topicIds={stage.topics.map((t) => t.id)} height={14} />
              </div>
            );
          }

          const entry = topicById.get(n.id);
          if (!entry) return null;
          const { topic, stage, index } = entry;

          // Tarmoq chizig'i tugunning ichkari qirrasiga ulanadi — shuning uchun
          // holat kvadratchasi tashqi qirrada turadi, chiziq ustida emas.
          const outerRight = n.side === "right";

          return (
            <div key={n.id} className="absolute" style={nodeStyle(n)}>
              <TopicLink
                href={`${basePath}/topic/${topic.id}`}
                locked={!free.has(topic.id)}
                title={topic.title}
                lockedClassName="opacity-55"
                lockSlot={
                  <span className="shrink-0 text-[var(--color-ink-3)]">
                    <LockMark />
                  </span>
                }
                className={
                  "flex h-full w-full items-center gap-2.5 border border-[var(--color-line-2)] bg-[var(--color-paper)] transition-colors hover:border-[var(--color-ink)] hover:bg-[var(--color-paper-2)] " +
                  (outerRight ? "pl-3 pr-8" : "pl-8 pr-3")
                }
              >
                <span className="mono shrink-0 whitespace-nowrap text-[11px] text-[var(--color-ink-3)]">
                  {`${String(stage.order).padStart(2, "0")}.${String(index + 1).padStart(2, "0")}`}
                </span>
                <span className="line-clamp-2 min-w-0 flex-1 text-[13.5px] font-medium leading-[1.3]">
                  {topic.title}
                </span>
                {topic.hot && (
                  <span
                    aria-label="Tez-tez so'raladi"
                    title="Tez-tez so'raladi"
                    className="size-[7px] shrink-0"
                    style={{ background: "var(--color-hot)" }}
                  />
                )}
              </TopicLink>

              {/* Havola ichida tugma bo'lmaydi — qirrada alohida turadi */}
              <span
                className={
                  "absolute top-1/2 -translate-y-1/2 " +
                  (outerRight ? "right-[-9px]" : "left-[-9px]")
                }
              >
                <StatusDot topicId={topic.id} title={topic.title} />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
