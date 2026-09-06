import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ComingSoonCard({
  icon: Icon,
  title,
  description,
  tone = "primary",
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: "primary" | "warm" | "accent" | "info" | "success";
}) {
  const tones: Record<string, string> = {
    primary: "bg-secondary text-secondary-foreground",
    warm: "bg-warm/15 text-warm",
    accent: "bg-accent/40 text-accent-foreground",
    info: "bg-info/15 text-info",
    success: "bg-success/15 text-success",
  };
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          tones[tone],
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-sans text-base font-bold text-foreground">{title}</h3>
          <Badge variant="secondary" className="rounded-full font-semibold">
            Coming Soon
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
