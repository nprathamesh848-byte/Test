import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorRetryProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorRetry({
  message = "Unable to load data.",
  onRetry,
  className,
}: ErrorRetryProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center",
        className
      )}
    >
      <AlertCircle className="h-8 w-8 text-destructive opacity-70" />
      <p className="text-sm font-medium text-destructive">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </Button>
      )}
    </div>
  );
}

interface SectionSkeletonProps {
  rows?: number;
  className?: string;
}

export function SectionSkeleton({ rows = 3, className }: SectionSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  );
}
