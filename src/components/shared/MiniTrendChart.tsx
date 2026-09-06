import { cn } from "@/lib/utils";

interface MiniTrendChartProps {
  data: Array<{ label: string; percentage: number }>;
  height?: number;
  className?: string;
}

export function MiniTrendChart({ data, height = 120, className }: MiniTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-24 text-xs text-muted-foreground italic", className)}>
        Complete tests to see your performance trend.
      </div>
    );
  }

  const maxPct = Math.max(...data.map((d) => d.percentage), 1);

  return (
    <div className={cn("w-full", className)}>
      <div
        className="flex items-end gap-1.5 border-b border-l border-border pb-1 pl-1"
        style={{ height: `${height}px` }}
        role="img"
        aria-label="Performance trend chart"
      >
        {data.map((point, i) => {
          const barHeight = Math.max(8, (point.percentage / 100) * (height - 24));
          const isLast = i === data.length - 1;
          return (
            <div
              key={i}
              className="group relative flex flex-1 flex-col items-center gap-0.5"
              style={{ minWidth: 0 }}
            >
              {/* Tooltip on hover */}
              <div className="absolute -top-7 hidden group-hover:flex items-center justify-center rounded-lg bg-foreground px-2 py-1 text-[10px] font-bold text-background z-10 whitespace-nowrap">
                {point.percentage}%
              </div>
              {/* Value label */}
              <span className="text-[10px] font-bold text-muted-foreground">{point.percentage}%</span>
              {/* Bar */}
              <div
                style={{ height: `${barHeight}px` }}
                className={cn(
                  "w-full rounded-t-md transition-all duration-300",
                  isLast
                    ? "brand-gradient"
                    : point.percentage >= 80
                    ? "bg-success/70"
                    : point.percentage >= 60
                    ? "bg-info/70"
                    : "bg-destructive/70"
                )}
              />
            </div>
          );
        })}
      </div>
      {/* X-axis labels */}
      <div className="flex gap-1.5 pl-1 pt-1.5">
        {data.map((point, i) => (
          <div key={i} className="flex-1 truncate text-center text-[9px] text-muted-foreground">
            {`T${i + 1}`}
          </div>
        ))}
      </div>
    </div>
  );
}
