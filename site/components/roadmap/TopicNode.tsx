import Link from "next/link";
import type { Topic } from "@/content/schema";
import { StatusMark } from "./StatusMark";

export function TopicNode({
  topic,
  href,
  index,
}: {
  topic: Topic;
  href: string;
  index: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex min-h-[74px] flex-col justify-between px-4 py-3 transition-colors hover:bg-[var(--color-paper-2)]"
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
    </Link>
  );
}
