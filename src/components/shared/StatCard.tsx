import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  tone?: "default" | "success" | "info" | "warning" | "destructive";
  className?: string;
}

const toneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-primary",
  success: "text-success",
  info: "text-info",
  warning: "text-warm",
  destructive: "text-destructive",
};

export function StatCard({ label, value, sub, icon: Icon, tone = "default", className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-soft flex flex-col gap-2",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </span>
        )}
      </div>
      <p className={cn("text-3xl font-bold leading-none", toneClasses[tone])}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
