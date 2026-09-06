import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  ChevronLeft,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AimsAiAnalysisCard } from "@/components/shared/AimsAiAnalysisCard";
import { fetchOrGenerateAimsAiAnalysis, AimsAiReport } from "@/lib/services/aims-ai";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/student/test-result/$attemptId")({
  head: () => ({ meta: [{ title: "Test Result & AIMS AI — AIMS AI" }] }),
  component: TestResultPage,
});

function TestResultPage() {
  const { attemptId } = Route.useParams();

  // Fetch attempt details
  const { data: attempt, isLoading: isAttemptLoading } = useQuery({
    queryKey: ["attempt-result", attemptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_attempts")
        .select("*, tests(*, subjects(name)), question_attempts(*, test_questions(*))")
        .eq("id", attemptId)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  // Generate or fetch AIMS AI Analysis
  const { data: aiReport, isLoading: isAiLoading } = useQuery<AimsAiReport>({
    queryKey: ["aims-ai-report", attemptId],
    enabled: !!attempt && (attempt.status === "SUBMITTED" || attempt.status === "AUTO_SUBMITTED"),
    queryFn: async () => {
      return await fetchOrGenerateAimsAiAnalysis({
        reportType: "STUDENT_TEST_ANALYSIS",
        studentId: attempt!.student_id,
        testId: attempt!.test_id,
        inputData: {
          score: attempt!.score,
          totalMarks: attempt!.total_marks,
          percentage: attempt!.percentage,
          correctCount: attempt!.correct_count,
          wrongCount: attempt!.wrong_count,
          skippedCount: attempt!.skipped_count,
          timeTaken: attempt!.time_taken_seconds,
          testTitle: attempt!.tests?.title,
          subject: attempt!.tests?.subjects?.name,
        },
      });
    },
  });

  if (isAttemptLoading) {
    return <Skeleton className="h-96 rounded-3xl" />;
  }

  if (!attempt) {
    return <div className="p-8 text-center">Test result not found.</div>;
  }

  const isPassed = attempt.score >= (attempt.tests?.passing_marks || 0);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 gap-1">
          <Link to="/student/tests">
            <ChevronLeft className="h-4 w-4" /> Back to My Tests
          </Link>
        </Button>

        {/* Hero Score Banner */}
        <div className="brand-gradient text-primary-foreground rounded-3xl p-6 shadow-lift sm:p-8 text-center space-y-4">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-foreground/20 text-accent">
            <Award className="h-8 w-8" />
          </div>
          <div>
            <Badge className="bg-primary-foreground/20 text-primary-foreground">
              {attempt.tests?.subjects?.name} • Class {attempt.tests?.class_level}
            </Badge>
            <h1 className="text-3xl font-bold mt-2">{attempt.tests?.title}</h1>
            <p className="text-sm opacity-90 mt-1">
              Submitted on{" "}
              {new Date(attempt.submitted_at || attempt.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="inline-block p-4 rounded-2xl bg-primary-foreground/10 border border-primary-foreground/20">
            <p className="text-xs uppercase font-bold tracking-wider opacity-80">Official Score</p>
            <p className="text-4xl font-bold mt-1">
              {attempt.score} / {attempt.total_marks} ({attempt.percentage}%)
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-success/30 bg-success/10 text-center shadow-soft">
          <CheckCircle2 className="h-6 w-6 text-success mx-auto mb-1" />
          <p className="text-xs font-semibold text-muted-foreground uppercase">Correct</p>
          <p className="text-2xl font-bold text-success mt-1">{attempt.correct_count}</p>
        </Card>

        <Card className="p-4 border-destructive/30 bg-destructive/10 text-center shadow-soft">
          <XCircle className="h-6 w-6 text-destructive mx-auto mb-1" />
          <p className="text-xs font-semibold text-muted-foreground uppercase">Wrong</p>
          <p className="text-2xl font-bold text-destructive mt-1">{attempt.wrong_count}</p>
        </Card>

        <Card className="p-4 border-muted text-center shadow-soft">
          <HelpCircle className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
          <p className="text-xs font-semibold text-muted-foreground uppercase">Skipped</p>
          <p className="text-2xl font-bold text-foreground mt-1">{attempt.skipped_count}</p>
        </Card>

        <Card className="p-4 border-info/30 bg-info/10 text-center shadow-soft">
          <Clock className="h-6 w-6 text-info mx-auto mb-1" />
          <p className="text-xs font-semibold text-muted-foreground uppercase">Time Taken</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {Math.round(attempt.time_taken_seconds / 60)}m
          </p>
        </Card>
      </div>

      {/* AIMS AI Analysis Section */}
      <AimsAiAnalysisCard report={aiReport || null} isLoading={isAiLoading} />

      {/* Question Review Section */}
      {attempt.tests?.show_result_immediately && attempt.question_attempts && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Question Review
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {attempt.question_attempts.map((qa: any, idx: number) => {
              const snapshot = (qa.test_questions?.question_snapshot as any) || {};
              const options = snapshot.options || [];

              return (
                <div
                  key={qa.id}
                  className={`p-4 rounded-2xl border ${
                    qa.is_correct
                      ? "border-success/40 bg-success/5"
                      : qa.is_answered
                        ? "border-destructive/40 bg-destructive/5"
                        : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-bold text-xs">Question {idx + 1}</span>
                    <Badge
                      className={
                        qa.is_correct
                          ? "bg-success text-success-foreground"
                          : qa.is_answered
                            ? "bg-destructive text-destructive-foreground"
                            : "bg-muted text-muted-foreground"
                      }
                    >
                      {qa.is_correct
                        ? "Correct (+ " + qa.marks_awarded + ")"
                        : qa.is_answered
                          ? "Wrong (0)"
                          : "Skipped"}
                    </Badge>
                  </div>
                  <p className="font-semibold text-sm text-foreground mb-3">
                    {snapshot.question_text}
                  </p>

                  <div className="space-y-1.5 text-xs">
                    {options.map((opt: any, oIdx: number) => {
                      const isStudentChoice = qa.selected_option_id === opt.id;
                      const isCorrectOpt = opt.is_correct;

                      return (
                        <div
                          key={opt.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between ${
                            isCorrectOpt
                              ? "border-success bg-success/20 font-bold text-success-foreground"
                              : isStudentChoice && !isCorrectOpt
                                ? "border-destructive bg-destructive/20 font-bold text-destructive-foreground"
                                : "border-border opacity-80"
                          }`}
                        >
                          <span>
                            {String.fromCharCode(65 + oIdx)}. {opt.option_text}
                          </span>
                          {isCorrectOpt && (
                            <span className="text-[10px] uppercase font-bold text-success">
                              Correct Answer
                            </span>
                          )}
                          {isStudentChoice && !isCorrectOpt && (
                            <span className="text-[10px] uppercase font-bold text-destructive">
                              Your Choice
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {snapshot.explanation && (
                    <div className="mt-3 p-3 rounded-xl bg-muted/60 text-xs text-muted-foreground">
                      <span className="font-bold text-foreground block mb-1">Explanation:</span>
                      {snapshot.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
