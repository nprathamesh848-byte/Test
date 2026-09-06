import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/shared/AuthLayout";
import { FormField } from "@/components/shared/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { emailSchema } from "@/lib/validation";
import { friendlyError } from "@/lib/auth/errors";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot password — AIMS AI" },
      { name: "description", content: "Reset your AIMS AI password by email." },
      { property: "og:title", content: "Forgot password — AIMS AI" },
      { property: "og:description", content: "Reset your AIMS AI password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    setSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      toast.error(friendlyError(err, "We couldn't send the reset email. Please try again."));
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a link to reset it."
      footer={
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Back to Login
        </Link>
      }
    >
      {sent ? (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-success/10 p-6 text-center">
          <MailCheck className="h-8 w-8 text-success" />
          <p className="font-semibold text-foreground">Check your inbox</p>
          <p className="text-sm text-muted-foreground">
            If an account exists for <span className="font-semibold">{email}</span>, we've sent
            password reset instructions.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <FormField id="email" label="Email" error={error}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
            />
          </FormField>
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={sending}>
            {sending ? "Sending..." : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
