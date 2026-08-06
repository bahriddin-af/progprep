import { roadmap } from "@/lib/content";
import { ProgressReport } from "@/components/roadmap/ProgressReport";

export default function ProgressPage() {
  const stages = roadmap.stages.map((s) => ({
    id: s.id,
    order: s.order,
    title: s.title,
    slug: s.slug,
    topicIds: s.topics.map((t) => t.id),
  }));

  return (
    <div className="mx-auto max-w-[1116px] px-6 py-12">
      <h1 className="text-balance text-[clamp(1.9rem,4vw,2.6rem)] font-bold tracking-[-0.03em]">Progress</h1>
      <div className="mt-8">
        <ProgressReport stages={stages} slug={roadmap.slug} />
      </div>
    </div>
  );
}
