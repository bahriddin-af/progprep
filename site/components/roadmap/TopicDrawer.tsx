// SERVER komponent — mazmun bu yerda render qilinadi, JS bundle'iga tushmaydi.

import type { Stage, Topic } from "@/content/schema";
import { DrawerShell } from "./DrawerShell";
import { StatusToggle } from "./StatusToggle";
import { QuestionAccordion } from "./QuestionAccordion";
import { TopicGate } from "@/components/auth/SignInGate";

export function TopicDrawer({
  stage,
  topic,
  closeHref,
  prevHref,
  nextHref,
  locked,
}: {
  stage: Stage;
  topic: Topic;
  closeHref: string;
  prevHref?: string;
  nextHref?: string;
  locked: boolean;
}) {
  return (
    <DrawerShell
      title={topic.title}
      stageNo={String(stage.order).padStart(2, "0")}
      stageTitle={stage.title}
      hot={topic.hot}
      closeHref={closeHref}
      prevHref={prevHref}
      nextHref={nextHref}
    >
      <TopicBody topic={topic} locked={locked} />
    </DrawerShell>
  );
}

export function TopicBody({ topic, locked }: { topic: Topic; locked: boolean }) {
  return (
    <>
      {/* Qisqacha mazmun qulfdan tashqarida — odam nima olishini ko'rsin. */}
      <p className="max-w-[68ch] text-[15px] leading-relaxed text-[var(--color-ink-2)]">
        {topic.summary}
      </p>

      <TopicGate locked={locked} topicTitle={topic.title}>
        <div className="mt-5">
          <StatusToggle topicId={topic.id} />
        </div>

        <article
          className="lesson mt-9"
          dangerouslySetInnerHTML={{ __html: topic.lesson }}
        />

        <h3 className="label mt-14 border-b border-[var(--color-line)] pb-2 text-[var(--color-ink)]">
          Intervyu savollari · {topic.questions.length}
        </h3>
        <div className="mt-4">
          <QuestionAccordion questions={topic.questions} />
        </div>
      </TopicGate>
    </>
  );
}
