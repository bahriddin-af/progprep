import type { Topic } from "@/content/schema";
import { StatusMark } from "./StatusMark";
import { TopicLink } from "./TopicLink";
import { LockMark } from "@/components/auth/SignInGate";

export function TopicNode({
  topic,
  href,
  index,
  locked,
}: {
  topic: Topic;
  href: string;
  index: string;
  locked: boolean;
}) {
  return (
    <TopicLink
      href={href}
      locked={locked}
      title={topic.title}
      lockedClassName="opacity-60"
      lockSlot={
        <span className="absolute right-4 top-3 text-[var(--color-ink-3)]">
          <LockMark />
        </span>
      }
      className="group relative flex min-h-[74px] w-full flex-col justify-between px-4 py-3 transition-colors hover:bg-[var(--color-paper-2)]"
    >
      <div className="flex items-start gap-2.5">
        <span className="mono mt-[1px] shrink-0 text-[11px] text-[var(--color-ink-3)]">
          {index}
        </span>
        <span className="min-w-0 flex-1 text-[13.5px] font-medium leading-snug">
          {topic.title}
        </span>
        {topic.hot && (
          <span
            aria-label="Tez-tez so'raladi"
            title="Tez-tez so'raladi"
            className="mt-[3px] size-[7px] shrink-0"
            style={{ background: "var(--color-hot)" }}
          />
        )}
      </div>

      <div className="mt-2 flex items-center gap-2 pl-[26px]">
        <StatusMark topicId={topic.id} />
      </div>
    </TopicLink>
  );
}
