import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  BarChart3,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AimsAiAnalysisCard } from "@/components/shared/AimsAiAnalysisCard";
import { StatCard } from "@/components/shared/StatCard";
import { MiniTrendChart } from "@/components/shared/MiniTrendChart";
import { PerformanceBadge } from "@/components/shared/PerformanceBadge";
import { ErrorRetry, SectionSkeleton } from "@/components/shared/ErrorRetry";
import { fetchOrGenerateAimsAiAnalysis } from "@/lib/services/aims-ai";
import {
  aggregateSubjectPerformance,
  buildTrendData,
  computeAccuracy,
  formatDuration,
} from "@/lib/performance";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/teacher/student/$studentId")({
  head: () => ({ meta: [{ title: "Student Detail — AIMS AI" }] }),
  component: TeacherStudentDetailPage,
});

function TeacherStudentDetailPage() {
  const { studentId } = Route.useParams();

  // ── Student profile ──────────────────────────────────────────────
  const { data: studentProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["teacher-student-profile", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email, avatar_url")
        .eq("id", studentId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: studentRow } = useQuery({
    queryKey: ["teacher-student-record", studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("students")
        .select("class_level, school_name, preferred_language")
        .eq("user_id", studentId)
        .maybeSingle();
      return data;
    },
  });

  // ── Attempts ─────────────────────────────────────────────────────
  const {
    data: attempts = [],
    isLoading: isAttemptsLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["teacher-student-attempts", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_attempts")
        .select("id, test_id, score, total_marks, percentage, correct_count, wrong_count, skipped_count, time_taken_seconds, submitted_at, status, tests(title, duration_minutes, subjects(name))")
        .eq("student_id", studentId)
        .in("status", ["SUBMITTED", "AUTO_SUBMITTED"])
        .order("submitted_at", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // ── Derived ──────────────────────────────────────────────────────
  const testsCompleted = attempts.length;
  const avgPct =
    testsCompleted > 0
      ? Math.round(attempts.reduce((s, a) => s + (a.percentage || 0), 0) / testsCompleted)
      : 0;
  const totalCorrect = attempts.reduce((s, a) => s + (a.correct_count || 0), 0);
  const totalWrong = attempts.reduce((s, a) => s + (a.wrong_count || 0), 0);
  const avgAccuracy = computeAccuracy(totalCorrect, totalWrong, 0);
  const bestScore = testsCompleted > 0 ? Math.max(...attempts.map((a) => a.percentage || 0)) : 0;
  const subjectPerf = aggregateSubjectPerformance(attempts);
  const trendData = buildTrendData(attempts);

  // Trend analysis: is student improving?
  const recentPcts = trendData.slice(-3).map((t) => t.percentage);
  const isTrendingUp =
    recentPcts.length >= 2 &&
    (recentPcts[recentPcts.length - 1] ?? 0) > (recentPcts[0] ?? 0);

  // ── AIMS AI teacher analysis ──────────────────────────────────────
  const { data: aiReport, isLoading: isAiLoading } = useQuery({
    queryKey: ["teacher-student-ai", studentId, testsCompleted],
    enabled: testsCompleted > 0,
    staleTime: 1000 * 60 * 10,
    queryFn: async () =>
      await fetchOrGenerateAimsAiAnalysis({
        reportType: "TEACHER_STUDENT_ANALYSIS",
        studentId,
        inputData: {
          percentage: avgPct,
          accuracy: avgAccuracy,
          testsCompleted,
          bestScore,
          isTrendingUp,
          subjects: subjectPerf.slice(0, 5),
          studentName: studentProfile?.full_name,
          classLevel: studentRow?.class_level,
        },
      }),
  });

  const isLoading = isProfileLoading || isAttemptsLoading;

  if (error) {
    return <ErrorRetry message="Unable to load student data." onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-8">
      {/* Back */}
      <Button asChild variant="ghost" size="sm" className="gap-1">
        <Link to="/teacher/classes">
          <ChevronLeft className="h-4 w-4" /> Back to Classes
        </Link>
      </Button>

      {/* ── STUDENT PROFILE HEADER ─────────────────────────────────── */}
      <section className="brand-gradient rounded-3xl p-6 text-primary-foreground shadow-lift sm:p-8">
        {isProfileLoading ? (
          <Skeleton className="h-16 w-48 bg-primary-foreground/20 rounded-2xl" />
        ) : (
          <>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-foreground/20 text-2xl font-bold text-primary-foreground">
                {studentProfile?.full_name?.charAt(0) ?? "?"}
              </div>
              <div>
                <h1 className="text-3xl font-bold">{studentProfile?.full_name ?? "Student"}</h1>
                <p className="text-sm opacity-80 mt-0.5">{studentProfile?.email}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {studentRow?.class_level && (
                <Badge className="bg-primary-foreground/20 text-primary-foreground">
                  Class {studentRow.class_level}
                </Badge>
              )}
              {studentRow?.school_name && (
                <Badge className="bg-primary-foreground/20 text-primary-foreground">
                  {studentRow.school_name}
                </Badge>
              )}
              {isTrendingUp && testsCompleted >= 2 && (
                <Badge className="bg-success text-success-foreground">
                  📈 Improving
                </Badge>
              )}
            </div>
          </>
        )}
      </section>

      {/* ── PERFORMANCE STATS ──────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-xl font-bold">Performance Summary</h2>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        ) : testsCompleted === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
            <p className="font-bold">No tests completed yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Assign and publish a test to see this student's performance.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Average Score" value={`${avgPct}%`} tone={avgPct >= 80 ? "success" : avgPct >= 60 ? "info" : "destructive"} />
            <StatCard label="Accuracy" value={`${avgAccuracy}%`} tone="info" />
            <StatCard label="Best Score" value={`${bestScore}%`} tone="success" />
            <StatCard label="Tests Done" value={testsCompleted} />
          </div>
        )}
      </section>

      {/* ── PERFORMANCE TREND ──────────────────────────────────────── */}
      {trendData.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">Score Trend</h2>
          <Card className="p-6 shadow-soft">
            <MiniTrendChart data={trendData} height={140} />
          </Card>
        </section>
      )}

      {/* ── SUBJECT PERFORMANCE ────────────────────────────────────── */}
      {subjectPerf.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">Subject Performance</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {subjectPerf.map((s) => (
              <div
                key={s.subjectName}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-soft"
              >
                <div>
                  <p className="font-bold text-sm">{s.subjectName}</p>
                  <p className="text-xs text-muted-foreground">{s.testCount} test{s.testCount !== 1 ? "s" : ""}</p>
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

      {/* ── TEST HISTORY ───────────────────────────────────────────── */}
      {attempts.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">Test History</h2>
          <div className="space-y-2">
            {[...attempts].reverse().slice(0, 10).map((att: any) => (
              <div
                key={att.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm truncate">{att.tests?.title}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>{att.tests?.subjects?.name}</span>
                    <span>·</span>
                    <span>{new Date(att.submitted_at || att.created_at).toLocaleDateString("en-IN")}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(att.time_taken_seconds || 0)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-bold text-base">{att.score} / {att.total_marks}</p>
                    <p className="text-xs text-muted-foreground">{att.percentage}%</p>
                  </div>
                  <PerformanceBadge percentage={att.percentage} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── AIMS AI TEACHER ANALYSIS ───────────────────────────────── */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Sparkles className="h-5 w-5 text-accent" />
          AIMS AI — Teacher Analysis
        </h2>
        {testsCompleted === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
            <p className="font-bold">No data for AIMS AI analysis</p>
          </Card>
        ) : (
          <AimsAiAnalysisCard report={aiReport ?? null} isLoading={isAiLoading} />
        )}
      </section>
    </div>
  );
}
