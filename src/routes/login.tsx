import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/shared/AuthLayout";
import { FormField } from "@/components/shared/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { dashboardPathFor, fetchMyRole } from "@/lib/auth/roles";
import { friendlyError } from "@/lib/auth/errors";
import { loginSchema, validate } from "@/lib/validation";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — AIMS AI" },
      { name: "description", content: "Sign in to AIMS AI as a student, teacher or admin." },
      { property: "og:title", content: "Sign in — AIMS AI" },
      { property: "og:description", content: "Sign in to your AIMS AI account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { isLoading, isAuthenticated, currentRole } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Already signed in → go straight to the right dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated && currentRole) {
      void navigate({ to: dashboardPathFor(currentRole), replace: true });
    }
  }, [isLoading, isAuthenticated, currentRole, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const { data, errors } = validate(loginSchema, { email, password });
    if (errors) {
      setErrors(errors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) throw error;
      const role = await fetchMyRole();
      toast.success("Welcome back!");
      await navigate({ to: dashboardPathFor(role), replace: true });
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back 👋"
      subtitle="Sign in to continue your learning journey."
      footer={
        <>
          New to AIMS AI?{" "}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Create Account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormField id="email" label="Email" error={errors["email"]}>
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
        <FormField id="password" label="Password" error={errors["password"]}>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11"
          />
        </FormField>
        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-sm font-semibold text-primary hover:underline"
          >
            Forgot Password?
          </Link>
        </div>
        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Signing in..." : "Login"}
        </Button>
      </form>
    </AuthLayout>
  );
}
