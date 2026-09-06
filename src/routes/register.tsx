import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, MailCheck, Presentation } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/shared/AuthLayout";
import { FormField } from "@/components/shared/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { dashboardPathFor, fetchMyRole } from "@/lib/auth/roles";
import { friendlyError } from "@/lib/auth/errors";
import {
  CLASS_LEVELS,
  LANGUAGES,
  studentRegisterSchema,
  teacherRegisterSchema,
  validate,
} from "@/lib/validation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — AIMS AI" },
      {
        name: "description",
        content: "Create a free AIMS AI account as a student (Class 1–10) or a teacher.",
      },
      { property: "og:title", content: "Create account — AIMS AI" },
      { property: "og:description", content: "Join AIMS AI as a student or teacher." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RegisterPage,
});

type RoleChoice = "student" | "teacher";

function RegisterPage() {
  const navigate = useNavigate();
  const { isLoading, isAuthenticated, currentRole } = useAuth();
  const [role, setRole] = useState<RoleChoice | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    classLevel: "",
    schoolName: "",
    dateOfBirth: "",
    preferredLanguage: "English",
    specialization: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated && currentRole)
      void navigate({ to: dashboardPathFor(currentRole), replace: true });
  }, [isLoading, isAuthenticated, currentRole, navigate]);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !role) return;

    const schema = role === "student" ? studentRegisterSchema : teacherRegisterSchema;
    const { data, errors } = validate(schema, form);
    if (errors) {
      setErrors(errors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      // The database trigger only honours "student" or "teacher" — admin can never be requested here.
      const metadata: Record<string, string | number> = {
        full_name: data.fullName,
        requested_role: role,
        school_name: form.schoolName.trim(),
      };
      if (role === "student") {
        metadata["class_level"] = Number(form.classLevel);
        metadata["date_of_birth"] = form.dateOfBirth;
        metadata["preferred_language"] = form.preferredLanguage;
      } else {
        metadata["specialization"] = form.specialization.trim();
      }

      const { data: result, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: { data: metadata, emailRedirectTo: window.location.origin },
      });
      if (error) throw error;

      if (!result.session) {
        setNeedsConfirm(true);
        return;
      }
      const resolved = await fetchMyRole();
      toast.success("Your account is ready. Welcome to AIMS AI!");
      await navigate({ to: dashboardPathFor(resolved ?? role), replace: true });
    } catch (err) {
      toast.error(friendlyError(err, "We couldn't create your account. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  if (needsConfirm) {
    return (
      <AuthLayout
        title="Almost there!"
        subtitle="Confirm your email to finish creating your account."
      >
        <div className="flex flex-col items-center gap-3 rounded-xl bg-success/10 p-6 text-center">
          <MailCheck className="h-8 w-8 text-success" />
          <p className="text-sm text-muted-foreground">
            We sent a confirmation link to{" "}
            <span className="font-semibold text-foreground">{form.email}</span>. Click it, then sign
            in.
          </p>
          <Button asChild variant="outline" className="mt-2">
            <Link to="/login">Go to Login</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (!role) {
    return (
      <AuthLayout
        title="Create your account"
        subtitle="First, tell us who you are."
        footer={
          <>
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Login
            </Link>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <RoleCard
            icon={GraduationCap}
            title="I'm a Student"
            description="Class 1 to 10"
            tone="warm"
            onClick={() => setRole("student")}
          />
          <RoleCard
            icon={Presentation}
            title="I'm a Teacher"
            description="Manage classes & tests"
            tone="primary"
            onClick={() => setRole("teacher")}
          />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={role === "student" ? "Student Registration" : "Teacher Registration"}
      subtitle={
        role === "student" ? "Let's set up your learning space." : "Set up your teaching workspace."
      }
      footer={
        <button
          type="button"
          onClick={() => setRole(null)}
          className="font-semibold text-primary hover:underline"
        >
          ← Choose a different role
        </button>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormField id="fullName" label="Full name" error={errors["fullName"]}>
          <Input
            id="fullName"
            autoComplete="name"
            value={form.fullName}
            onChange={(e) => set("fullName")(e.target.value)}
            className="h-11"
          />
        </FormField>
        <FormField id="email" label="Email" error={errors["email"]}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => set("email")(e.target.value)}
            className="h-11"
          />
        </FormField>
        <FormField
          id="password"
          label="Password"
          error={errors["password"]}
          hint="At least 8 characters with letters and numbers."
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => set("password")(e.target.value)}
            className="h-11"
          />
        </FormField>

        {role === "student" ? (
          <>
            <FormField id="classLevel" label="Class / Standard" error={errors["classLevel"]}>
              <Select value={form.classLevel} onValueChange={set("classLevel")}>
                <SelectTrigger id="classLevel" className="h-11">
                  <SelectValue placeholder="Select your class" />
                </SelectTrigger>
                <SelectContent>
                  {CLASS_LEVELS.map((c) => (
                    <SelectItem key={c} value={String(c)}>
                      Class {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField
              id="schoolName"
              label="School name"
              error={errors["schoolName"]}
              hint="Optional"
            >
              <Input
                id="schoolName"
                value={form.schoolName}
                onChange={(e) => set("schoolName")(e.target.value)}
                className="h-11"
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="dateOfBirth"
                label="Date of birth"
                error={errors["dateOfBirth"]}
                hint="Optional"
              >
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => set("dateOfBirth")(e.target.value)}
                  className="h-11"
                  max={new Date().toISOString().slice(0, 10)}
                />
              </FormField>
              <FormField
                id="preferredLanguage"
                label="Preferred language"
                error={errors["preferredLanguage"]}
              >
                <Select value={form.preferredLanguage} onValueChange={set("preferredLanguage")}>
                  <SelectTrigger id="preferredLanguage" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          </>
        ) : (
          <>
            <FormField
              id="schoolName"
              label="School name"
              error={errors["schoolName"]}
              hint="Optional"
            >
              <Input
                id="schoolName"
                value={form.schoolName}
                onChange={(e) => set("schoolName")(e.target.value)}
                className="h-11"
              />
            </FormField>
            <FormField
              id="specialization"
              label="Subject / specialization"
              error={errors["specialization"]}
              hint="Optional · e.g. Mathematics"
            >
              <Input
                id="specialization"
                value={form.specialization}
                onChange={(e) => set("specialization")(e.target.value)}
                className="h-11"
              />
            </FormField>
          </>
        )}

        <Button
          type="submit"
          variant={role === "student" ? "warm" : "hero"}
          size="lg"
          className="w-full"
          disabled={submitting}
        >
          {submitting ? "Creating your account..." : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}

function RoleCard({
  icon: Icon,
  title,
  description,
  tone,
  onClick,
}: {
  icon: typeof GraduationCap;
  title: string;
  description: string;
  tone: "warm" | "primary";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex flex-col items-start gap-3 rounded-2xl border-2 border-border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lift",
        tone === "warm" ? "hover:border-warm" : "hover:border-primary",
      )}
    >
      <span
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl",
          tone === "warm" ? "bg-warm/15 text-warm" : "bg-secondary text-secondary-foreground",
        )}
      >
        <Icon className="h-6 w-6" />
      </span>
      <span>
        <span className="block font-bold text-foreground">{title}</span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}
