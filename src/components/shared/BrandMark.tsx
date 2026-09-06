import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  size = "md",
  withTagline = false,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  withTagline?: boolean;
}) {
  const box =
    size === "lg"
      ? "h-14 w-14 text-2xl"
      : size === "sm"
        ? "h-8 w-8 text-sm"
        : "h-10 w-10 text-base";
  const text = size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-xl";
  return (
    <Link
      to="/"
      className={cn("inline-flex items-center gap-3", className)}
      aria-label="AIMS AI home"
    >
      <span
        className={cn(
          "brand-gradient flex items-center justify-center rounded-2xl font-display font-bold text-primary-foreground shadow-soft",
          box,
        )}
      >
        A
      </span>
      <span className="flex flex-col leading-tight">
        <span className={cn("font-display font-bold text-foreground", text)}>AIMS AI</span>
        {withTagline && (
          <span className="text-xs font-medium tracking-wide text-muted-foreground">
            Assess. Identify. Improve. Master.
          </span>
        )}
      </span>
    </Link>
  );
}
