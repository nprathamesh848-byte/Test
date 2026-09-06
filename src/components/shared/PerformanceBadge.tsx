import { cn } from "@/lib/utils";
import { getPerformanceLevel, PERFORMANCE_LABELS, PERFORMANCE_COLORS } from "@/lib/performance";

interface PerformanceBadgeProps {
  percentage: number | null | undefined;
  className?: string;
}

export function PerformanceBadge({ percentage, className }: PerformanceBadgeProps) {
  const level = getPerformanceLevel(percentage);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        PERFORMANCE_COLORS[level],
        className
      )}
    >
      {PERFORMANCE_LABELS[level]}
    </span>
  );
}
