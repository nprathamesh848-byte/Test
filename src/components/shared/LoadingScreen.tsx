import { Loader2 } from "lucide-react";

export function LoadingScreen({ message = "Loading..." }: { message?: string }) {
  return (
    <div
      className="page-bg flex min-h-screen flex-col items-center justify-center gap-3 text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

export function InlineLoading({ message = "Loading..." }: { message?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-2 py-12 text-muted-foreground"
      role="status"
    >
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}
