import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Award,
  Target,
  Zap,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/_authenticated/student/performance")({
  head: () => ({ meta: [{ title: "My Performance — AIMS AI" }] }),
  component: StudentPerformancePage,
});

function StudentPerformancePage() {
  const { currentUser } = useAuth();
  const [trendFilter, setTrendFilter] = useState<"7" | "all">("all");

  const {
    data: attempts = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["student-performance-attempts", currentUser?.id],
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

  const testsCompleted = attempts.length;
  const avgPercentage =
    testsCompleted > 0
      ? Math.round(attempts.reduce((s, a) => s + (a.percentage || 0), 0) / testsCompleted)
      : 0;
  const totalCorrect = attempts.reduce((s, a) => s + (a.correct_count || 0), 0);
  const totalWrong = attempts.reduce((s, a) => s + (a.wrong_count || 0), 0);
  const totalSkipped = attempts.reduce((s, a) => s + (a.skipped_count || 0), 0);
  const avgAccuracy = computeAccuracy(totalCorrect, totalWrong, 0);
  const bestScore = testsCompleted > 0 ? Math.max(...attempts.map((a) => a.percentage || 0)) : 0;
  const avgTimeSec =
    testsCompleted > 0
      ? Math.round(attempts.reduce((s, a) => s + (a.time_taken_seconds || 0), 0) / testsCompleted)
      : 0;

  const subjectPerf = aggregateSubjectPerformance(attempts);
  const filteredForTrend = trendFilter === "7" ? attempts.slice(-7) : attempts;
  const trendData = buildTrendData(filteredForTrend);

  const weakSubjects = subjectPerf.filter((s) => s.level === "NEEDS_PRACTICE");
  const strongSubjects = subjectPerf.filter((s) => s.level === "STRONG");

  const { data: aiReport, isLoading: isAiLoading } = useQuery({
    queryKey: ["student-perf-ai", currentUser?.id, testsCompleted],
    enabled: !!currentUser && testsCompleted > 0,
    staleTime: 1000 * 60 * 10,
    queryFn: async () =>
      await fetchOrGenerateAimsAiAnalysis({
        reportType: "STUDENT_OVERALL_ANALYSIS",
        studentId: currentUser!.id,
        inputData: {
          percentage: avgPercentage,
          accuracy: avgAccuracy,
          testsCompleted,
          bestScore,
          attempts: attempts.slice(-5).map((a) => ({
            title: a.tests?.title,
            percentage: a.percentage,
            subject: a.tests?.subjects?.name,
          })),
        },
      }),
  });

  if (error) {
    return <ErrorRetry message="Unable to load performance data." onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Performance & Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Detailed breakdown of your scores, subjects, topics, and improvement over time.
        </p>
      </div>

      <Tabs defaultValue="overall" className="space-y-6">
        <TabsList className="flex h-auto flex-wrap gap-1 sm:grid sm:w-full sm:grid-cols-4">
          <TabsTrigger value="overall">Overall</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="history">Test History</TabsTrigger>
          <TabsTrigger value="ai">AIMS AI</TabsTrigger>
        </TabsList>

        {/* ── OVERALL ── */}
        <TabsContent value="overall" className="space-y-6">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard label="Average Score" value={`${avgPercentage}%`} tone={avgPercentage >= 80 ? "success" : avgPercentage >= 60 ? "info" : "destructive"} />
                <StatCard label="Accuracy" value={`${avgAccuracy}%`} sub="Correct ÷ answered" tone="info" />
                <StatCard label="Best Score" value={`${bestScore}%`} tone="success" />
                <StatCard label="Tests Done" value={testsCompleted} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <StatCard label="Correct" value={totalCorrect} icon={CheckCircle2} tone="success" />
                <StatCard label="Wrong" value={totalWrong} icon={XCircle} tone="destructive" />
                <StatCard label="Skipped" value={totalSkipped} icon={BookOpen} />
              </div>

              <Card className="p-6 shadow-soft">
                <div className="mb-4 flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" /> Score Trend
                  </CardTitle>
                  <div className="flex gap-1">
                    {(["7", "all"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setTrendFilter(f)}
                        className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${trendFilter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                      >
                        {f === "7" ? "Last 7" : "All"}
                      </button>
                    ))}
                  </div>
                </div>
                <MiniTrendChart data={trendData} height={160} />
              </Card>
            </>
          )}
        </TabsContent>

        {/* ── SUBJECTS ── */}
        <TabsContent value="subjects" className="space-y-4">
          {isLoading ? (
            <SectionSkeleton rows={4} />
          ) : subjectPerf.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
              <p className="font-bold">No subject data yet</p>
              <p className="text-sm text-muted-foreground mt-1">Complete tests to see subject-level performance.</p>
            </div>
          ) : (
            <>
              {strongSubjects.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-success">
                    ✓ Strong Subjects
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {strongSubjects.map((s) => (
                      <SubjectCard key={s.subjectName} subject={s} />
                    ))}
                  </div>
                </div>
              )}
              {weakSubjects.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-destructive">
                    ⚠ Needs Practice
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {weakSubjects.map((s) => (
                      <SubjectCard key={s.subjectName} subject={s} />
                    ))}
                  </div>
                </div>
              )}
              {subjectPerf.filter((s) => s.level === "AVERAGE").length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-info">
                    → Average Subjects
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {subjectPerf
                      .filter((s) => s.level === "AVERAGE")
                      .map((s) => (
                        <SubjectCard key={s.subjectName} subject={s} />
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ── TEST HISTORY ── */}
        <TabsContent value="history" className="space-y-3">
          {isLoading ? (
            <SectionSkeleton rows={5} />
          ) : attempts.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
              <p className="font-bold">No completed tests yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...attempts].reverse().map((att: any) => (
                <div
                  key={att.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm truncate">{att.tests?.title}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>{att.tests?.subjects?.name}</span>
                      <span>·</span>
                      <span>{new Date(att.submitted_at || att.created_at).toLocaleDateString("en-IN")}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(att.time_taken_seconds || 0)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-base">{att.score} / {att.total_marks}</p>
                      <PerformanceBadge percentage={att.percentage} />
                    </div>
                    <Button asChild variant="outline" size="sm" className="gap-1">
                      <Link to="/student/test-result/$attemptId" params={{ attemptId: att.id }}>
                        Analysis <ChevronRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
              <div className="pt-2 text-center">
                <Button asChild variant="outline" size="sm">
                  <Link to="/student/history">View full history</Link>
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── AIMS AI ── */}
        <TabsContent value="ai">
          {testsCompleted === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <Zap className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
              <p className="font-bold">Complete a test to unlock AIMS AI analysis</p>
            </div>
          ) : (
            <AimsAiAnalysisCard report={aiReport ?? null} isLoading={isAiLoading} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SubjectCard({
  subject,
}: {
  subject: { subjectName: string; avgPercentage: number; testCount: number; level: string };
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div>
        <p className="font-bold text-sm">{subject.subjectName}</p>
        <p className="text-xs text-muted-foreground">{subject.testCount} test{subject.testCount !== 1 ? "s" : ""}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-2xl font-bold text-primary">{subject.avgPercentage}%</span>
        <PerformanceBadge percentage={subject.avgPercentage} />
      </div>
    </div>
  );
}
