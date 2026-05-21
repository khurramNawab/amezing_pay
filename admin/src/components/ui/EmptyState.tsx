import { cn } from "@/components/ui/cn";
import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-10 text-center",
        className,
      )}
    >
      <div className="text-sm font-semibold">{title}</div>
      {description ? (
        <div className="mt-1 text-sm text-text-muted">{description}</div>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
