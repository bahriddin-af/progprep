// Intercepting route — ro'yxatdan bosilganda drawer sifatida ochiladi.
import { TopicDrawer } from "@/components/roadmap/TopicDrawer";
import { allTopicParams, resolveTopic } from "../../../topicShared";

export function generateStaticParams() {
  return allTopicParams();
}

export default async function TopicDrawerRoute({
  params,
}: {
  params: Promise<{ slug: string; topicId: string }>;
}) {
  const { slug, topicId } = await params;
  const { stage, topic, basePath, prevHref, nextHref } = resolveTopic(slug, topicId);

  return (
    <TopicDrawer
      stage={stage}
      topic={topic}
      closeHref={basePath}
      prevHref={prevHref}
      nextHref={nextHref}
    />
  );
}
