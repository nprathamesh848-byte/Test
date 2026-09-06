import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Clock,
  Play,
  ChevronRight,
  TrendingUp,
  Award,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BarChart3,
  Target,
  Zap,
  History,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AimsAiAnalysisCard } from "@/components/shared/AimsAiAnalysisCard";
import { StatCard } from "@/components/shared/StatCard";
import { MiniTrendChart } from "@/components/shared/MiniTrendChart";
import { PerformanceBadge } from "@/components/shared/PerformanceBadge";
import { ErrorRetry, SectionSkeleton } from "@/components/shared/ErrorRetry";
import { fetchOrGenerateAimsAiAnalysis } from "@/lib/services/aims-ai";
import {
  aggregateSubjectPerformance,
  buildTrendData,
  getTimeGreeting,
  getMotivationalMessage,
  formatDuration,
  computeAccuracy,
} from "@/lib/performance";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/_authenticated/student/dashboard")({
  head: () => ({ meta: [{ title: "My Dashboard — AIMS AI" }] }),
  component: StudentDashboard,
});

function StudentDashboard() {
  const { currentUser, profile } = useAuth();

  // ── Core data: student record + all attempts + assignments ──────────
  const {
    data: studentData,
    isLoading: isStudentLoading,
    error: studentError,
    refetch: refetchStudent,
  } = useQuery({
    queryKey: ["student-profile", currentUser?.id],
    enabled: !!currentUser,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("class_level, school_name, preferred_language")
        .eq("user_id", currentUser!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const {
    data: completedAttempts = [],
    isLoading: isAttemptsLoading,
    error: attemptsError,
    refetch: refetchAttempts,
  } = useQuery({
    queryKey: ["student-completed-attempts", currentUser?.id],
    enabled: !!currentUser,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_attempts")
        .select(
          "id, test_id, score, total_marks, percentage, correct_count, wrong_count, skipped_count, time_taken_seconds, submitted_at, status, tests(title, duration_minutes, subject_id, subjects(name))"
        )
        .eq("student_id", currentUser!.id)
        .in("status", ["SUBMITTED", "AUTO_SUBMITTED"])
        .order("submitted_at", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const {
    data: assignments = [],
    isLoading: isAssignmentsLoading,
    error: assignmentsError,
    refetch: refetchAssignments,
  } = useQuery({
    queryKey: ["student-assignments-dash", currentUser?.id],
    enabled: !!currentUser,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_assignments")
        .select(
          "id, status, assigned_at, due_at, tests(id, title, duration_minutes, total_marks, class_level, subjects(name))"
        )
        .eq("student_id", currentUser!.id)
        .in("status", ["ASSIGNED", "STARTED"])
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // ── Class-level Tests ────────────────────────────────────────
  const { data: classTests = [], isLoading: isClassTestsLoading, error: classTestsError, refetch: refetchClassTests } = useQuery({
    queryKey: ["student-class-tests", currentUser?.id, studentData?.class_level],
    enabled: !!currentUser && !!studentData?.class_level,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tests")
        .select("id, title, duration_minutes, total_marks, class_level, subjects(name)")
        .eq("status", "PUBLISHED")
        .eq("class_level", studentData!.class_level)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const {
    data: inProgressAttempt,
  } = useQuery({
    queryKey: ["student-in-progress", currentUser?.id],
    enabled: !!currentUser,
    queryFn: async () => {
      const { data } = await supabase
        .from("test_attempts")
        .select("id, test_id, expires_at, tests(title)")
        .eq("student_id", currentUser!.id)
        .eq("status", "IN_PROGRESS")
        .maybeSingle();
      return data as any;
    },
  });

  const {
    data: aiRecommendations = [],
  } = useQuery({
    queryKey: ["student-ai-recs", currentUser?.id],
    enabled: !!currentUser,
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_recommendations")
        .select("id, title, description, priority, recommendation_type, reason")
        .eq("student_id", currentUser!.id)
        .eq("status", "ACTIVE")
        .order("priority", { ascending: false })
        .limit(5);
      return (data || []) as any[];
    },
  });

  // ── Derived metrics ─────────────────────────────────────────────────
  const testsCompleted = completedAttempts.length;
  const testsPending = assignments.length;
  const avgPercentage =
    testsCompleted > 0
      ? Math.round(completedAttempts.reduce((s, a) => s + (a.percentage || 0), 0) / testsCompleted)
      : 0;
  const totalCorrect = completedAttempts.reduce((s, a) => s + (a.correct_count || 0), 0);
  const totalWrong = completedAttempts.reduce((s, a) => s + (a.wrong_count || 0), 0);
  const avgAccuracy = computeAccuracy(totalCorrect, totalWrong, 0);

  const recentAttempt = [...completedAttempts].reverse()[0] ?? null;
  const subjectPerf = aggregateSubjectPerformance(completedAttempts);
  const trendData = buildTrendData(completedAttempts);

  // ── AIMS AI ─────────────────────────────────────────────────────────
  const { data: aiReport, isLoading: isAiLoading } = useQuery({
    queryKey: ["student-dash-ai", currentUser?.id, testsCompleted],
    enabled: !!currentUser && testsCompleted > 0,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      return await fetchOrGenerateAimsAiAnalysis({
        reportType: "STUDENT_OVERALL_ANALYSIS",
        studentId: currentUser!.id,
        inputData: {
          percentage: avgPercentage,
          accuracy: avgAccuracy,
          testsCompleted,
          subjects: subjectPerf.slice(0, 5),
          recentTrend: trendData.slice(-3).map((t) => t.percentage),
        },
      });
    },
  });

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const greeting = getTimeGreeting();
  const motivationalMsg = getMotivationalMessage(avgPercentage, testsCompleted);

  const isLoading = isStudentLoading || isAttemptsLoading || isAssignmentsLoading;

  return (
    <div className="space-y-8">
      {/* ── WELCOME BANNER ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl warm-gradient p-6 shadow-lift sm:p-8">
        <div className="relative z-10">
          <p className="text-sm font-semibold uppercase tracking-wider text-warm-foreground/80">
            {greeting}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-warm-foreground sm:text-4xl">
            {firstName} 👋
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {studentData?.class_level && (
              <Badge className="rounded-full bg-warm-foreground/20 text-warm-foreground hover:bg-warm-foreground/20">
                Class {studentData.class_level}
              </Badge>
            )}
            {studentData?.school_name && (
              <span className="text-sm font-medium text-warm-foreground/90">
                {studentData.school_name}
              </span>
            )}
          </div>
          <p className="mt-3 max-w-md text-sm font-medium text-warm-foreground/90">
            {motivationalMsg}
          </p>
        </div>
        {/* Decorative background shape */}
        <div className="pointer-events-none absolute right-0 top-0 h-full w-1/3 opacity-10">
          <Sparkles className="absolute right-8 top-8 h-24 w-24 text-warm-foreground" />
        </div>
      </section>

      {/* ── IN PROGRESS ALERT ─────────────────────────────────────── */}
      {inProgressAttempt && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border-2 border-warm/40 bg-warm/10 p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-warm" />
            <div>
              <p className="font-bold text-sm text-foreground">Test in Progress</p>
              <p className="text-xs text-muted-foreground">{inProgressAttempt.tests?.title}</p>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            className="bg-warm text-warm-foreground hover:bg-warm/90 gap-1.5"
          >
            <Link to="/student/take-test/$attemptId" params={{ attemptId: inProgressAttempt.id }}>
              <Play className="h-3.5 w-3.5" /> Continue Test
            </Link>
          </Button>
        </div>
      )}

      {/* ── QUICK ACTIONS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { to: "/student/tests", label: "My Tests", icon: BookOpen, count: testsPending, countLabel: "pending" },
          { to: "/student/performance", label: "Performance", icon: BarChart3 },
          { to: "/student/history", label: "History", icon: History, count: testsCompleted, countLabel: "done" },
          { to: "/student/analytics", label: "Analytics", icon: TrendingUp },
        ].map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-4 text-center shadow-soft transition-all hover:border-primary/40 hover:shadow-lift"
          >
            <action.icon className="h-5 w-5 text-primary" />
            <span className="text-xs font-bold text-foreground">{action.label}</span>
            {action.count != null && (
              <Badge variant="secondary" className="text-[10px] px-2">
                {action.count} {action.countLabel}
              </Badge>
            )}
          </Link>
        ))}
      </div>

      {/* ── OVERALL STATS ─────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-xl font-bold">Overall Performance</h2>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label="Average Score"
              value={`${avgPercentage}%`}
              sub="Across all tests"
              tone={avgPercentage >= 80 ? "success" : avgPercentage >= 60 ? "info" : "destructive"}
            />
            <StatCard label="Accuracy" value={`${avgAccuracy}%`} sub="Correct / answered" tone="info" />
            <StatCard label="Tests Completed" value={testsCompleted} sub="Submitted tests" tone="default" />
            <StatCard label="Tests Pending" value={testsPending} sub="Awaiting attempt" tone="warning" />
          </div>
        )}
      </section>

      {/* ── PENDING TESTS ─────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Pending Tests</h2>
          <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
            <Link to="/student/tests">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>

        {isAssignmentsLoading ? (
          <SectionSkeleton rows={2} />
        ) : assignmentsError ? (
          <ErrorRetry
            message="Unable to load pending tests."
            onRetry={() => void refetchAssignments()}
          />
        ) : assignments.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-success opacity-60" />
            <p className="font-bold">All caught up!</p>
            <p className="text-sm text-muted-foreground">No pending tests right now. Your teacher will assign new ones here.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {assignments.slice(0, 4).map((a) => {
              const test = a.tests;
              const isStarted = a.status === "STARTED";
              return (
                <Card
                  key={a.id}
                  className="flex flex-col justify-between hover:border-primary/40 transition-colors"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Badge variant="outline" className="text-[10px] mb-1">
                          {test?.subjects?.name ?? "Subject"}
                        </Badge>
                        <CardTitle className="text-lg font-bold leading-tight">{test?.title}</CardTitle>
                      </div>
                      <Badge
                        className={
                          isStarted
                            ? "bg-warm text-warm-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }
                      >
                        {isStarted ? "In Progress" : "Assigned"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground font-semibold">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        {test?.duration_minutes} min
                      </span>
                      <span>{test?.total_marks} marks</span>
                    </div>
                    <Button
                      asChild
                      className="w-full brand-gradient text-primary-foreground gap-2"
                      size="sm"
                    >
                      <Link to="/student/tests">
                        <Play className="h-3.5 w-3.5" />
                        {isStarted ? "Continue Test" : "Start Test"}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      {/* ── CLASS TESTS ─────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Class Tests</h2>
          <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
            <Link to="/student/tests">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
        {isClassTestsLoading ? (
          <SectionSkeleton rows={2} />
        ) : classTestsError ? (
          <ErrorRetry message="Unable to load class tests." onRetry={() => void refetchClassTests()} />
        ) : classTests.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-muted-foreground opacity-60" />
            <p className="font-bold">No tests for your class yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {classTests.slice(0, 4).map((t) => (
              <Card key={t.id} className="flex flex-col justify-between hover:border-primary/40 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge variant="outline" className="text-[10px] mb-1">
                        {t.subjects?.name ?? \"Subject\"}
                      </Badge>
                      <CardTitle className="text-lg font-bold leading-tight">{t.title}</CardTitle>
                    </div>
                    <Badge>{`Class ${t.class_level}`}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground font-semibold">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-primary" />{t.duration_minutes} min
                    </span>
                    <span>{t.total_marks} marks</span>
                  </div>
                  <Button asChild className="w-full brand-gradient text-primary-foreground gap-2" size="sm">
                    <Link to={`/student/tests/${t.id}`}>Start Test</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
      </section>

      {/* ── RECENT RESULT ──────────────────────────────────────────── */}
      {recentAttempt && (
        <section>
          <h2 className="mb-4 text-xl font-bold">Recent Result</h2>
          <Card className="overflow-hidden border-2 border-primary/20 shadow-lift">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <Badge variant="outline" className="text-xs">
                    {recentAttempt.tests?.subjects?.name}
                  </Badge>
                  <h3 className="text-2xl font-bold">{recentAttempt.tests?.title}</h3>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      {recentAttempt.correct_count ?? 0} / {recentAttempt.total_marks ?? 0} correct
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="h-4 w-4 text-info" />
                      {computeAccuracy(
                        recentAttempt.correct_count || 0,
                        recentAttempt.wrong_count || 0,
                        recentAttempt.skipped_count || 0
                      )}% accuracy
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {formatDuration(recentAttempt.time_taken_seconds || 0)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold ${
                      (recentAttempt.percentage || 0) >= 80
                        ? "bg-success/15 text-success"
                        : (recentAttempt.percentage || 0) >= 60
                        ? "bg-info/15 text-info"
                        : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {recentAttempt.percentage ?? 0}%
                  </div>
                  <Button asChild variant="outline" size="sm" className="gap-1.5">
                    <Link
                      to="/student/test-result/$attemptId"
                      params={{ attemptId: recentAttempt.id }}
                    >
                      View Analysis <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── PERFORMANCE TREND ──────────────────────────────────────── */}
      {testsCompleted > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Performance Trend</h2>
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
              <Link to="/student/performance">
                Full analytics <ChevronRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
          <Card className="p-6 shadow-soft">
            <MiniTrendChart data={trendData} height={140} />
          </Card>
        </section>
      )}

      {/* ── SUBJECT PERFORMANCE ────────────────────────────────────── */}
      {subjectPerf.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">Subject Performance</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjectPerf.map((s) => (
              <div
                key={s.subjectName}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-soft"
              >
                <div>
                  <p className="font-bold text-sm">{s.subjectName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {s.testCount} test{s.testCount !== 1 ? "s" : ""}
                  </p>
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

      {/* ── AIMS AI RECOMMENDATIONS ────────────────────────────────── */}
      {aiRecommendations.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
            <Sparkles className="h-5 w-5 text-accent" />
            AIMS AI Recommendations
          </h2>
          <div className="space-y-3">
            {aiRecommendations.map((rec: any, i: number) => (
              <div
                key={rec.id}
                className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{rec.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{rec.reason || rec.description}</p>
                </div>
                <Badge
                  className={
                    rec.priority === "HIGH"
                      ? "bg-destructive text-destructive-foreground text-[10px]"
                      : rec.priority === "MEDIUM"
                      ? "bg-warn text-warn-foreground text-[10px]"
                      : "bg-secondary text-secondary-foreground text-[10px]"
                  }
                >
                  {rec.priority}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── AIMS AI FULL ANALYSIS ──────────────────────────────────── */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Zap className="h-5 w-5 text-primary" /> AIMS AI Intelligence
        </h2>
        {testsCompleted === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
            <h3 className="text-lg font-bold">Complete your first test</h3>
            <p className="text-sm text-muted-foreground mt-1">
              AIMS AI will analyse your performance and provide personalized recommendations after you complete a test.
            </p>
          </Card>
        ) : (
          <AimsAiAnalysisCard report={aiReport ?? null} isLoading={isAiLoading} />
        )}
      </section>
    </div>
  );
}
