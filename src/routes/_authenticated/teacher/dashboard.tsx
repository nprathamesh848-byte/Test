import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  BookOpen,
  BarChart3,
  AlertTriangle,
  Plus,
  ChevronRight,
  Sparkles,
  GraduationCap,
  FileText,
  HelpCircle,
  Clock,
  CheckCircle2,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AimsAiAnalysisCard } from "@/components/shared/AimsAiAnalysisCard";
import { StatCard } from "@/components/shared/StatCard";
import { PerformanceBadge } from "@/components/shared/PerformanceBadge";
import { ErrorRetry, SectionSkeleton } from "@/components/shared/ErrorRetry";
import { fetchOrGenerateAimsAiAnalysis } from "@/lib/services/aims-ai";
import { aggregateSubjectPerformance } from "@/lib/performance";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/_authenticated/teacher/dashboard")({
  head: () => ({ meta: [{ title: "Teacher Dashboard — AIMS AI" }] }),
  component: TeacherDashboard,
});

function TeacherDashboard() {
  const { currentUser, profile } = useAuth();

  // ── My classes ───────────────────────────────────────────────────
  const {
    data: classes = [],
    isLoading: isClassesLoading,
    error: classesError,
    refetch: refetchClasses,
  } = useQuery({
    queryKey: ["teacher-classes-dash", currentUser?.id],
    enabled: !!currentUser,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*, class_students(count)")
        .eq("created_by", currentUser!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // ── My tests ─────────────────────────────────────────────────────
  const {
    data: tests = [],
    isLoading: isTestsLoading,
  } = useQuery({
    queryKey: ["teacher-tests-dash", currentUser?.id],
    enabled: !!currentUser,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tests")
        .select("id, title, status, class_level, created_by, subjects(name), test_assignments(count), test_attempts(count)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // ── All completed attempts across teacher's tests ────────────────
  const {
    data: allAttempts = [],
    isLoading: isAttemptsLoading,
  } = useQuery({
    queryKey: ["teacher-all-attempts-dash", currentUser?.id],
    enabled: !!currentUser,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_attempts")
        .select("id, student_id, test_id, percentage, correct_count, wrong_count, skipped_count, submitted_at, status, profiles:student_id(full_name, email), tests(title, subject_id, subjects(name), created_by)")
        .in("status", ["SUBMITTED", "AUTO_SUBMITTED"])
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // ── Question count ───────────────────────────────────────────────
  const { data: questionCount } = useQuery({
    queryKey: ["teacher-question-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("questions")
        .select("id", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  // ── Derived metrics ──────────────────────────────────────────────
  const totalStudents = classes.reduce(
    (sum, cls) => sum + (cls.class_students?.[0]?.count ?? 0),
    0
  );
  const activeTests = tests.filter((t) => t.status === "PUBLISHED").length;
  const draftTests = tests.filter((t) => t.status === "DRAFT").length;
  const totalSubmissions = allAttempts.length;
  const pendingSubmissions = tests.reduce(
    (sum, t) => sum + ((t.test_assignments?.[0]?.count ?? 0) - (t.test_attempts?.[0]?.count ?? 0)),
    0
  );
  const avgClassPerf =
    allAttempts.length > 0
      ? Math.round(allAttempts.reduce((s, a) => s + (a.percentage || 0), 0) / allAttempts.length)
      : 0;

  // Students needing attention (< 60% avg)
  const studentPerf = new Map<string, { name: string; total: number; count: number; attempts: number[] }>();
  for (const att of allAttempts) {
    const sid = att.student_id as string;
    const entry = studentPerf.get(sid) ?? { name: att.profiles?.full_name ?? "Student", total: 0, count: 0, attempts: [] as number[] };
    entry.total += att.percentage ?? 0;
    entry.count += 1;
    entry.attempts.push((att.percentage ?? 0) as number);
    studentPerf.set(sid, entry);
  }
  const studentsNeedingAttention = Array.from(studentPerf.entries())
    .map(([id, s]) => ({ id, name: s.name, avg: Math.round(s.total / s.count), count: s.count }))
    .filter((s) => s.avg < 60)
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 5);

  // Subject performance across all class attempts
  const subjectPerf = aggregateSubjectPerformance(allAttempts as any[]);

  // AIMS AI class insight (for first class)
  const firstClassId = classes[0]?.id;
  const { data: aiReport, isLoading: isAiLoading } = useQuery({
    queryKey: ["teacher-dash-ai", firstClassId, totalSubmissions],
    enabled: !!firstClassId && totalSubmissions > 0,
    staleTime: 1000 * 60 * 10,
    queryFn: async () =>
      await fetchOrGenerateAimsAiAnalysis({
        reportType: "CLASS_ANALYSIS",
        classId: firstClassId,
        inputData: {
          className: classes[0]?.name,
          classAverage: avgClassPerf,
          totalStudents,
          totalSubmissions,
          studentsNeedingAttention: studentsNeedingAttention.length,
          subjectBreakdown: subjectPerf.slice(0, 5),
        },
      }),
  });

  const isLoading = isClassesLoading || isTestsLoading || isAttemptsLoading;

  return (
    <div className="space-y-8">
      {/* ── WELCOME BANNER ─────────────────────────────────────────── */}
      <section className="brand-gradient rounded-3xl p-6 text-primary-foreground shadow-lift sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wider opacity-80">
          AIMS AI Teacher Portal
        </p>
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
          Welcome, {profile?.full_name?.split(" ")[0] ?? "Teacher"} 👋
        </h1>
        <p className="mt-2 max-w-lg text-sm opacity-90">
          Your classes, student performance, and AI-powered insights — all in one place.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1.5" size="sm">
            <Link to="/teacher/create-test">
              <Plus className="h-4 w-4" /> Create Test
            </Link>
          </Button>
          <Button asChild variant="outline" className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/20 gap-1.5" size="sm">
            <Link to="/teacher/question-bank">
              <HelpCircle className="h-4 w-4" /> Question Bank
            </Link>
          </Button>
        </div>
      </section>

      {/* ── OVERVIEW STATS ─────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-xl font-bold">Overview</h2>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Classes" value={classes.length} icon={GraduationCap} />
            <StatCard label="Students" value={totalStudents} icon={Users} />
            <StatCard label="Active Tests" value={activeTests} icon={BookOpen} tone="success" />
            <StatCard label="Draft Tests" value={draftTests} icon={FileText} tone="warning" />
            <StatCard label="Questions" value={questionCount ?? 0} icon={HelpCircle} />
            <StatCard label="Class Avg" value={`${avgClassPerf}%`} icon={BarChart3} tone={avgClassPerf >= 70 ? "success" : avgClassPerf >= 50 ? "info" : "destructive"} />
          </div>
        )}
      </section>

      {/* ── MY CLASSES ─────────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">My Classes</h2>
          <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
            <Link to="/teacher/classes">
              Manage <ChevronRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>

        {isClassesLoading ? (
          <SectionSkeleton rows={2} />
        ) : classesError ? (
          <ErrorRetry message="Unable to load classes." onRetry={() => void refetchClasses()} />
        ) : classes.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <GraduationCap className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
            <p className="font-bold">No classes created yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first class to start managing students.
            </p>
            <Button asChild className="mt-4 brand-gradient text-primary-foreground" size="sm">
              <Link to="/teacher/classes">Create Class</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classes.slice(0, 6).map((cls) => {
              const studentCount = cls.class_students?.[0]?.count ?? 0;
              // Attempts for this class (via test_assignments class_id)
              const clsAttempts = allAttempts.filter((a) =>
                a.tests && !a.tests.created_by // fallback: all for now
              );
              const clsAvg =
                clsAttempts.length > 0
                  ? Math.round(clsAttempts.reduce((s: number, a: any) => s + (a.percentage || 0), 0) / clsAttempts.length)
                  : null;
              return (
                <Card key={cls.id} className="hover:border-primary/50 transition-all hover:shadow-soft flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">Class {cls.class_level}</Badge>
                      <Badge className="bg-success/20 text-success font-semibold text-xs">
                        {cls.academic_year}
                      </Badge>
                    </div>
                    <CardTitle className="text-2xl font-bold mt-2">{cls.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <Users className="h-4 w-4 text-primary" />
                        {studentCount} Students
                      </span>
                      {clsAvg !== null && (
                        <span className="flex items-center gap-1.5">
                          <BarChart3 className="h-4 w-4 text-info" />
                          Avg: {clsAvg}%
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm" className="flex-1 gap-1">
                        <Link to="/teacher/class/$classId" params={{ classId: cls.id }}>
                          Dashboard <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm" className="gap-1">
                        <Link to="/teacher/class/$classId/analytics" params={{ classId: cls.id }}>
                          <BarChart3 className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ── STUDENTS NEEDING ATTENTION ─────────────────────────────── */}
      {studentsNeedingAttention.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Students Needing Attention
          </h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {studentsNeedingAttention.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <p className="font-bold text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.count} test{s.count !== 1 ? "s" : ""} completed</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-destructive">{s.avg}%</p>
                        <p className="text-[10px] text-muted-foreground">average</p>
                      </div>
                      <PerformanceBadge percentage={s.avg} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── SUBJECT PERFORMANCE OVERVIEW ──────────────────────────── */}
      {subjectPerf.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">Subject Performance Overview</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjectPerf.map((s) => (
              <div
                key={s.subjectName}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-soft"
              >
                <div>
                  <p className="font-bold text-sm">{s.subjectName}</p>
                  <p className="text-xs text-muted-foreground">{s.testCount} submissions</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-primary">{s.avgPercentage}%</span>
                  <PerformanceBadge percentage={s.avgPercentage} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── TEST MANAGEMENT QUICK ACCESS ──────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Test Management</h2>
          <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
            <Link to="/teacher/tests">
              All Tests <ChevronRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
        {isTestsLoading ? (
          <SectionSkeleton rows={3} />
        ) : tests.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
            <p className="font-bold">No tests created yet</p>
            <Button asChild className="mt-4 brand-gradient text-primary-foreground" size="sm">
              <Link to="/teacher/create-test">
                <Plus className="h-4 w-4 mr-1" /> Create Test
              </Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {tests.slice(0, 5).map((test) => (
              <div
                key={test.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 hover:bg-muted/20 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px]">Class {test.class_level}</Badge>
                    <Badge className="text-[10px] bg-secondary text-secondary-foreground">{test.subjects?.name}</Badge>
                    <Badge
                      className={`text-[10px] ${test.status === "PUBLISHED" ? "bg-success text-success-foreground" : test.status === "DRAFT" ? "bg-warm text-warm-foreground" : "bg-muted text-muted-foreground"}`}
                    >
                      {test.status}
                    </Badge>
                  </div>
                  <p className="font-bold text-sm truncate">{test.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {test.test_assignments?.[0]?.count ?? 0} assigned · {test.test_attempts?.[0]?.count ?? 0} submitted
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="gap-1">
                  <Link to="/teacher/test/$testId/results" params={{ testId: test.id }}>
                    <BarChart3 className="h-3.5 w-3.5" /> Results
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── AIMS AI CLASS INSIGHTS ─────────────────────────────────── */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Sparkles className="h-5 w-5 text-accent" />
          AIMS AI Class Intelligence
        </h2>
        {totalSubmissions === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
            <p className="font-bold">No submissions yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              AIMS AI class insights will appear after students complete tests.
            </p>
          </Card>
        ) : (
          <AimsAiAnalysisCard report={aiReport ?? null} isLoading={isAiLoading} />
        )}
      </section>

      {/* ── QUICK ACTIONS ─────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-xl font-bold">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { to: "/teacher/create-test", label: "Create Test", icon: Plus },
            { to: "/teacher/question-bank", label: "Question Bank", icon: HelpCircle },
            { to: "/teacher/tests", label: "All Tests", icon: BookOpen },
            { to: "/teacher/classes", label: "My Classes", icon: Users },
          ].map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-4 text-center shadow-soft transition-all hover:border-primary/40 hover:shadow-lift"
            >
              <action.icon className="h-5 w-5 text-primary" />
              <span className="text-xs font-bold text-foreground">{action.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
