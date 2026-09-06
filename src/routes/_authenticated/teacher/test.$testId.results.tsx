import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Users, CheckCircle, Clock, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/teacher/test/$testId/results")({
  head: () => ({ meta: [{ title: "Test Submissions — AIMS AI" }] }),
  component: TestSubmissionsPage,
});

function TestSubmissionsPage() {
  const { testId } = Route.useParams();

  // Fetch test info
  const { data: test, isLoading: isTestLoading } = useQuery({
    queryKey: ["test-info", testId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tests")
        .select("*, subjects(name)")
        .eq("id", testId)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  // Fetch attempts
  const { data: attempts = [], isLoading: isAttemptsLoading } = useQuery({
    queryKey: ["test-submissions", testId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_attempts")
        .select("*, profiles:student_id(full_name, email)")
        .eq("test_id", testId)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  if (isTestLoading || isAttemptsLoading) {
    return <Skeleton className="h-64 rounded-3xl" />;
  }

  if (!test) {
    return <div className="p-8 text-center">Test not found.</div>;
  }

  const completedAttempts = attempts.filter(
    (a) => a.status === "SUBMITTED" || a.status === "AUTO_SUBMITTED",
  );
  const avgPercentage =
    completedAttempts.length > 0
      ? Math.round(
          completedAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) /
            completedAttempts.length,
        )
      : 0;

  const passedCount = completedAttempts.filter((a) => a.score >= test.passing_marks).length;
  const passRate =
    completedAttempts.length > 0 ? Math.round((passedCount / completedAttempts.length) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 gap-1">
          <Link to="/teacher/tests">
            <ChevronLeft className="h-4 w-4" /> Back to Tests
          </Link>
        </Button>

        <div className="brand-gradient text-primary-foreground rounded-3xl p-6 shadow-lift sm:p-8">
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge className="bg-primary-foreground/20 text-primary-foreground">
              Class {test.class_level}
            </Badge>
            <Badge className="bg-primary-foreground/20 text-primary-foreground">
              {test.subjects?.name}
            </Badge>
            <Badge className="bg-success text-success-foreground font-semibold">
              {test.status}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold mt-2">{test.title}</h1>
          <p className="text-sm opacity-90 mt-1">
            Duration: {test.duration_minutes} min • Total Marks: {test.total_marks}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5 shadow-soft">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Submissions</p>
          <p className="text-3xl font-bold mt-1">{completedAttempts.length}</p>
        </Card>

        <Card className="p-5 shadow-soft">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Average Score</p>
          <p className="text-3xl font-bold mt-1 text-primary">{avgPercentage}%</p>
        </Card>

        <Card className="p-5 shadow-soft">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Pass Rate</p>
          <p className="text-3xl font-bold mt-1 text-success">{passRate}%</p>
        </Card>
      </div>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold">
            Student Submissions ({completedAttempts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedAttempts.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4">
              No completed student submissions yet.
            </p>
          ) : (
            <div className="space-y-3">
              {completedAttempts.map((a: any) => (
                <div
                  key={a.id}
                  className="p-4 rounded-xl border border-border flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-sm">{a.profiles?.full_name || "Student"}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.profiles?.email} • Time taken:{" "}
                      {Math.round((a.time_taken_seconds || 0) / 60)}m
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-base text-foreground">
                        {a.score} / {a.total_marks}
                      </p>
                      <Badge
                        className={
                          a.percentage >= 80
                            ? "bg-success text-success-foreground"
                            : a.percentage >= 60
                              ? "bg-warning text-warning-foreground"
                              : "bg-destructive text-destructive-foreground"
                        }
                      >
                        {a.percentage}%
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
