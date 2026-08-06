import raw from "@/content/roadmap.json";
import { roadmapSchema, type Roadmap, type Topic, type Stage } from "@/content/schema";

// Build vaqtida bir marta tekshiriladi. Sxema buzilsa sahifa qurilmaydi.
export const roadmap: Roadmap = roadmapSchema.parse(raw);

export const allRoadmaps: Roadmap[] = [roadmap];

export function getRoadmap(slug: string): Roadmap | undefined {
  return allRoadmaps.find((r) => r.slug === slug);
}

export function findTopic(
  r: Roadmap,
  topicId: string,
): { stage: Stage; topic: Topic } | undefined {
  for (const stage of r.stages) {
    const topic = stage.topics.find((t) => t.id === topicId);
    if (topic) return { stage, topic };
  }
  return undefined;
}

export function flatTopics(r: Roadmap): Topic[] {
  return r.stages.flatMap((s) => s.topics);
}

/** Drawer'dagi ← → tugmalari uchun qo'shni mavzular. */
export function neighbours(r: Roadmap, topicId: string) {
  const all = flatTopics(r);
  const i = all.findIndex((t) => t.id === topicId);
  return {
    prev: i > 0 ? all[i - 1] : undefined,
    next: i >= 0 && i < all.length - 1 ? all[i + 1] : undefined,
  };
}

export function totals(r: Roadmap) {
  const topics = flatTopics(r);
  return {
    stages: r.stages.length,
    topics: topics.length,
    questions: topics.reduce((n, t) => n + t.questions.length, 0),
    hot: topics.filter((t) => t.hot).length,
  };
}
