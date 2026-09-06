import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap,
  Presentation,
  School,
  ShieldCheck,
  Users,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({ meta: [{ title: "Admin Dashboard — AIMS AI" }] }),
  component: AdminDashboard,
});

async function count(
  table: "profiles" | "schools" | "teachers" | "students" | "classes" | "questions" | "tests",
) {
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

function AdminDashboard() {
  const { profile } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-counts-all"],
    queryFn: async () => {
      const [users, schools, teachers, students, classes, questions, tests] = await Promise.all([
        count("profiles"),
        count("schools"),
        count("teachers"),
        count("students"),
        count("classes"),
        count("questions"),
        count("tests"),
      ]);
      return { users, schools, teachers, students, classes, questions, tests };
    },
  });

  const stats = [
    {
      label: "Users",
      value: data?.users,
      icon: Users,
      tone: "bg-secondary text-secondary-foreground",
    },
    { label: "Schools", value: data?.schools, icon: School, tone: "bg-info/15 text-info" },
    {
      label: "Teachers",
      value: data?.teachers,
      icon: Presentation,
      tone: "bg-accent/40 text-accent-foreground",
    },
    { label: "Students", value: data?.students, icon: GraduationCap, tone: "bg-warm/15 text-warm" },
  ];

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            AIMS AI Administration
          </p>
          <h1 className="mt-1 text-3xl font-bold">Welcome, {profile?.full_name ?? "Admin"}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="w-fit gap-1.5 rounded-full bg-success px-3 py-1.5 text-success-foreground hover:bg-success font-semibold">
            <ShieldCheck className="h-4 w-4" /> Stages 1 – 5 Active
          </Badge>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/academic" className="gap-1.5">
              <School className="h-4 w-4" /> Academic Admin <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.tone}`}>
              <s.icon className="h-5 w-5" />
            </span>
            <p className="mt-4 text-sm font-semibold text-muted-foreground">{s.label}</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-9 w-16" />
            ) : (
              <p className="font-display text-3xl font-bold">{s.value ?? 0}</p>
            )}
          </div>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5 shadow-soft">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Classes Created</p>
          <p className="text-3xl font-bold mt-1 text-primary">{data?.classes ?? 0}</p>
        </Card>

        <Card className="p-5 shadow-soft">
          <p className="text-xs font-semibold text-muted-foreground uppercase">
            Question Bank Items
          </p>
          <p className="text-3xl font-bold mt-1 text-secondary-foreground">
            {data?.questions ?? 0}
          </p>
        </Card>

        <Card className="p-5 shadow-soft">
          <p className="text-xs font-semibold text-muted-foreground uppercase">
            Published Assessments
          </p>
          <p className="text-3xl font-bold mt-1 text-success">{data?.tests ?? 0}</p>
        </Card>
      </section>
    </div>
  );
}
