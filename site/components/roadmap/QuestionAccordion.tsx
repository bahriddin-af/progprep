"use client";

import { useState } from "react";
import type { Question } from "@/content/schema";

export function QuestionAccordion({ questions }: { questions: Question[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="border-t border-[var(--color-line-2)]">
      {questions.map((q, i) => {
        const expanded = open === q.id;
        return (
          <div key={q.id} className="border-b border-[var(--color-line-2)]">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setOpen(expanded ? null : q.id)}
              className="flex w-full items-start gap-3 py-3 text-left hover:bg-[var(--color-paper-2)]"
            >
              <span className="mono mt-[3px] shrink-0 text-[11px] text-[var(--color-ink-3)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 text-[14px] font-semibold leading-snug">
                {q.question}
              </span>
              <span className="mono mt-[2px] shrink-0 text-[13px] text-[var(--color-ink-3)]">
                {expanded ? "−" : "+"}
              </span>
            </button>
            {expanded && (
              <div
                className="lesson pb-4 pl-[26px] pr-6"
                dangerouslySetInnerHTML={{ __html: q.answer }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
