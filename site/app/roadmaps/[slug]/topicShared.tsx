import { notFound } from "next/navigation";
import { allRoadmaps, getRoadmap, findTopic, neighbours } from "@/lib/content";

export function allTopicParams() {
  return allRoadmaps.flatMap((r) =>
    r.stages.flatMap((s) => s.topics.map((t) => ({ slug: r.slug, topicId: t.id }))),
  );
}

export function resolveTopic(slug: string, topicId: string) {
  const roadmap = getRoadmap(slug);
  if (!roadmap) notFound();

  const found = findTopic(roadmap, topicId);
  if (!found) notFound();

  const basePath = `/roadmaps/${roadmap.slug}`;
  const nb = neighbours(roadmap, topicId);

  return {
    roadmap,
    basePath,
    stage: found.stage,
    topic: found.topic,
    prevHref: nb.prev ? `${basePath}/topic/${nb.prev.id}` : undefined,
    nextHref: nb.next ? `${basePath}/topic/${nb.next.id}` : undefined,
  };
}
