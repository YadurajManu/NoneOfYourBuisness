import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  title,
  children,
  eyebrow,
  description,
  action,
  className,
  contentClassName,
}: {
  title: string;
  children: ReactNode;
  eyebrow?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(20,31,44,0.98),rgba(14,23,35,0.98))] shadow-[var(--shadow-clinical)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,212,200,0.12),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.08),transparent_28%)]" />
      <div className="relative border-b border-white/6 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            {eyebrow ? (
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.28em] text-primary/70">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="font-display text-xl font-semibold tracking-[-0.03em] text-foreground">
              {title}
            </h2>
            {description ? (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </div>
      <div className={cn("relative px-5 py-5 sm:px-6 sm:py-6", contentClassName)}>
        {children}
      </div>
    </section>
  );
}
