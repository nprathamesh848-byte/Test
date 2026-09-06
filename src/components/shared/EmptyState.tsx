import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string | undefined;
  action?: ReactNode;
  className?: string | undefined;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-10 text-center",
        className,
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-base font-bold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
