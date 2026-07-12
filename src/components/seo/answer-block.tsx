import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Answer-first block for AEO: short direct answer in initial HTML
 * so answer engines can extract without relying on client JS.
 */
export function AnswerBlock({
  question,
  answer,
  className,
  children,
}: {
  question: string;
  /** ~40–60 words preferred for extractability */
  answer: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <section className={cn("scroll-mt-24", className)}>
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
        {question}
      </h2>
      <p className="aeo-answer mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground">
        {answer}
      </p>
      {children}
    </section>
  );
}
