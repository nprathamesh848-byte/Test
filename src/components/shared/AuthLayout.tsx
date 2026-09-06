import type { ReactNode } from "react";
import { BrandMark } from "./BrandMark";
import { Card, CardContent } from "@/components/ui/card";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string | undefined;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="page-bg flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <BrandMark size="lg" withTagline />
      </div>
      <Card className="w-full max-w-md rounded-2xl border-border/70 shadow-lift">
        <CardContent className="p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </CardContent>
      </Card>
      {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
    </main>
  );
}
