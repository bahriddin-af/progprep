import { notFound } from "next/navigation";
import { allRoadmaps, getRoadmap, totals } from "@/lib/content";
import { StageSection } from "@/components/roadmap/StageSection";
import { RoadmapGraph } from "@/components/roadmap/RoadmapGraph";
import { Legend } from "@/components/roadmap/Legend";
import { CANVAS_W } from "@/lib/graph";

export function generateStaticParams() {
  return allRoadmaps.map((r) => ({ slug: r.slug }));
}

export default async function RoadmapPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const roadmap = getRoadmap(slug);
  if (!roadmap) notFound();

  const t = totals(roadmap);

  const stats = (
    <p className="mono flex flex-wrap items-center justify-center gap-x-2 text-[12px] text-[var(--color-ink-3)]">
      <span>{t.stages} bosqich</span>
      <span>·</span>
      <span>{t.topics} mavzu</span>
      <span>·</span>
      <span>{t.questions} savol</span>
      <span>·</span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="inline-block size-[7px]"
          style={{ background: "var(--color-hot)" }}
        />
        {t.hot} tez-tez so&apos;raladi
      </span>
    </p>
  );

  return (
    <div className="mx-auto max-w-[1200px] px-6">
      {/* Tor ekranda oddiy sarlavha — u yerda xarita chizilmaydi */}
      <header className="border-b border-[var(--color-line)] py-10 lg:hidden">
        <p className="label">Roadmap</p>
        <h1 className="mt-2 text-balance text-[clamp(1.9rem,4vw,2.75rem)] font-bold leading-[1.05] tracking-[-0.03em]">
          {roadmap.title}
        </h1>
        <div className="mt-3 [&_p]:justify-start">{stats}</div>
      </header>

      {/* Sxematik xarita — faqat keng ekranda o'qiladi. Sarlavha va belgilar
          xarita kengligiga tekislanadi, shunda ular diagrammaning bir qismi
          bo'lib ko'rinadi — ustida suzib turgan quti emas. */}
      <div className="hidden py-10 lg:block">
        <div
          className="mx-auto flex items-end justify-between gap-10"
          style={{ width: CANVAS_W }}
        >
          <div>
            <p className="label">Roadmap</p>
            <h1 className="mt-2 text-[2.6rem] font-bold leading-[1.05] tracking-[-0.03em]">
              {roadmap.title}
            </h1>
            <div className="mt-3 [&_p]:justify-start">{stats}</div>
          </div>
          <Legend />
        </div>

        {/* Ajratuvchi chiziq — sarlavha tasmasi bilan bir xil kenglikda */}
        <div
          className="mx-auto mt-8 mb-10 border-b border-[var(--color-line)]"
          style={{ width: CANVAS_W }}
        />

        <RoadmapGraph
          stages={roadmap.stages}
          basePath={`/roadmaps/${roadmap.slug}`}
        />
      </div>

      {/* Tor ekranda xuddi shu mazmun ro'yxat sifatida */}
      <div className="space-y-16 py-12 lg:hidden">
        {roadmap.stages.map((stage) => (
          <StageSection
            key={stage.id}
            stage={stage}
            basePath={`/roadmaps/${roadmap.slug}`}
          />
        ))}
      </div>
    </div>
  );
}
