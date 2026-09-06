import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  TrendingUp,
  Target,
  Award,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AimsAiAnalysisCard } from "@/components/shared/AimsAiAnalysisCard";
import { fetchOrGenerateAimsAiAnalysis } from "@/lib/services/aims-ai";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/_authenticated/student/analytics")({
  head: () => ({ meta: [{ title: "My Performance Analytics — AIMS AI" }] }),
  component: StudentAnalyticsPage,
});

function StudentAnalyticsPage() {
  const { currentUser } = useAuth();

  // Fetch completed attempts
  const { data: attempts = [], isLoading: isAttemptsLoading } = useQuery({
    queryKey: ["student-analytics-attempts", currentUser?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_attempts")
        .select("*, tests(title, subject_id, subjects(name))")
        .eq("student_id", currentUser!.id)
        .in("status", ["SUBMITTED", "AUTO_SUBMITTED"])
        .order("submitted_at", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Calculate overall metrics
  const testsCompleted = attempts.length;
  const avgPercentage =
    testsCompleted > 0
      ? Math.round(attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / testsCompleted)
      : 0;

  const totalCorrect = attempts.reduce((sum: number, a: any) => sum + (a.correct_count || 0), 0);
  const totalQuestions = attempts.reduce(
    (sum: number, a: any) =>
      sum + ((a.correct_count || 0) + (a.wrong_count || 0) + (a.skipped_count || 0)),
    0,
  );
  const avgAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const bestScore = testsCompleted > 0 ? Math.max(...attempts.map((a) => a.percentage || 0)) : 0;

  // AIMS AI Overall Analysis
  const { data: aiReport, isLoading: isAiLoading } = useQuery({
    queryKey: ["student-overall-ai", currentUser?.id, testsCompleted],
    enabled: !!currentUser && testsCompleted > 0,
    queryFn: async () => {
      return await fetchOrGenerateAimsAiAnalysis({
        reportType: "STUDENT_OVERALL_ANALYSIS",
        studentId: currentUser!.id,
        inputData: {
          percentage: avgPercentage,
          accuracy: avgAccuracy,
          testsCompleted,
          bestScore,
          attempts: attempts.map((a) => ({
            title: a.tests?.title,
            percentage: a.percentage,
            subject: a.tests?.subjects?.name,
          })),
        },
      });
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Performance & Progress Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Deep analytics across subjects, topics, question timing, and performance trends over time.
        </p>
      </div>

      {/* Top Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-5 shadow-soft">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Average Score</p>
          <p className="text-3xl font-bold mt-1 text-primary">{avgPercentage}%</p>
        </Card>

        <Card className="p-5 shadow-soft">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Tests Completed</p>
          <p className="text-3xl font-bold mt-1">{testsCompleted}</p>
        </Card>

        <Card className="p-5 shadow-soft">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Accuracy Rate</p>
          <p className="text-3xl font-bold mt-1 text-success">{avgAccuracy}%</p>
        </Card>

        <Card className="p-5 shadow-soft">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Best Score</p>
          <p className="text-3xl font-bold mt-1 text-warning">{bestScore}%</p>
        </Card>
      </div>

      {/* Performance Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" /> Performance Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attempts.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-6 text-center">
              Complete tests to unlock your performance trend chart.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-end gap-2 h-44 pt-4 border-b border-l border-border px-2">
                {attempts.map((att, idx) => (
                  <div
                    key={att.id}
                    className="flex-1 flex flex-col items-center gap-1 group relative"
                  >
                    <div className="text-[10px] font-bold text-muted-foreground">
                      {att.percentage}%
                    </div>
                    <div
                      style={{ height: `${Math.max(10, (att.percentage / 100) * 120)}px` }}
                      className="w-full max-w-[40px] rounded-t-xl brand-gradient group-hover:brightness-110 transition-all"
                    />
                    <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                      Test {idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AIMS AI Overall Intelligence Card */}
      <AimsAiAnalysisCard report={aiReport || null} isLoading={isAiLoading} />
    </div>
  );
}
