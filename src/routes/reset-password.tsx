import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/shared/AuthLayout";
import { FormField } from "@/components/shared/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { passwordSchema } from "@/lib/validation";
import { friendlyError } from "@/lib/auth/errors";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password — AIMS AI" },
      { name: "description", content: "Choose a new password for your AIMS AI account." },
      { property: "og:title", content: "Set a new password — AIMS AI" },
      { property: "og:description", content: "Choose a new password for your AIMS AI account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{
    password?: string | undefined;
    confirm?: string | undefined;
  }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Supabase delivers the recovery session via the URL hash (type=recovery)
    const hash = window.location.hash;
    const isRecovery = hash.includes("type=recovery");
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && isRecovery)) setReady("ok");
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady("ok");
      else if (!isRecovery) setReady("invalid");
    });
    const timer = setTimeout(() => setReady((r) => (r === "checking" ? "invalid" : r)), 4000);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const parsed = passwordSchema.safeParse(password);
    const next: typeof errors = {};
    if (!parsed.success) next.password = parsed.error.issues[0]?.message;
    if (password !== confirm) next.confirm = "Passwords do not match.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You're signed in.");
      await supabase.auth.signOut();
      await navigate({ to: "/login", replace: true });
    } catch (err) {
      toast.error(friendlyError(err, "We couldn't update your password."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Choose a strong password you haven't used before."
    >
      {ready === "checking" && (
        <p className="text-sm text-muted-foreground">Verifying your reset link...</p>
      )}
      {ready === "invalid" && (
        <div className="space-y-4 text-sm">
          <p className="rounded-xl bg-destructive/10 p-4 font-medium text-destructive">
            This reset link is invalid or has expired.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link to="/forgot-password">Request a new link</Link>
          </Button>
        </div>
      )}
      {ready === "ok" && (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <FormField id="password" label="New password" error={errors.password}>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11"
            />
          </FormField>
          <FormField id="confirm" label="Confirm new password" error={errors.confirm}>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-11"
            />
          </FormField>
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={saving}>
            {saving ? "Saving..." : "Update password"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
