import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  ChevronLeft,
  Users,
  AlertTriangle,
  CheckCircle2,
  Award,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AimsAiAnalysisCard } from "@/components/shared/AimsAiAnalysisCard";
import { fetchOrGenerateAimsAiAnalysis } from "@/lib/services/aims-ai";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/teacher/class/$classId/analytics")({
  head: () => ({ meta: [{ title: "Class Analytics & Insights — AIMS AI" }] }),
  component: ClassAnalyticsPage,
});

function ClassAnalyticsPage() {
  const { classId } = Route.useParams();

  // Fetch Class details
  const { data: classData } = useQuery({
    queryKey: ["class-info", classId],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("*").eq("id", classId).single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch class student roster
  const { data: classStudents = [] } = useQuery({
    queryKey: ["class-students-roster", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("class_students")
        .select("student_id, profiles:student_id(full_name, email)")
        .eq("class_id", classId);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch test assignments and attempts for this class
  const { data: classAttempts = [] } = useQuery({
    queryKey: ["class-attempts-analytics", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_attempts")
        .select("*, profiles:student_id(full_name, email)")
        .in("status", ["SUBMITTED", "AUTO_SUBMITTED"]);
      if (error) throw error;
      return data || [];
    },
  });

  // Compute Class metrics
  const totalSubmissions = classAttempts.length;
  const classAvgPercentage =
    totalSubmissions > 0
      ? Math.round(
          classAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / totalSubmissions,
        )
      : 0;

  const passedSubmissions = classAttempts.filter((a) => a.percentage >= 60).length;
  const passRate =
    totalSubmissions > 0 ? Math.round((passedSubmissions / totalSubmissions) * 100) : 0;

  // Score distribution buckets
  const dist = {
    top: classAttempts.filter((a) => a.percentage >= 90).length,
    high: classAttempts.filter((a) => a.percentage >= 80 && a.percentage < 90).length,
    mid: classAttempts.filter((a) => a.percentage >= 70 && a.percentage < 80).length,
    pass: classAttempts.filter((a) => a.percentage >= 60 && a.percentage < 70).length,
    low: classAttempts.filter((a) => a.percentage < 60).length,
  };

  // Class AIMS AI Insights
  const { data: aiReport, isLoading: isAiLoading } = useQuery({
    queryKey: ["class-ai-insights", classId, totalSubmissions],
    enabled: totalSubmissions > 0,
    queryFn: async () => {
      return await fetchOrGenerateAimsAiAnalysis({
        reportType: "CLASS_ANALYSIS",
        classId,
        inputData: {
          className: classData?.name,
          classAverage: classAvgPercentage,
          passRate,
          totalSubmissions,
          studentsCount: classStudents.length,
          scoreDistribution: dist,
        },
      });
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 gap-1">
          <Link to="/teacher/class/$classId" params={{ classId }}>
            <ChevronLeft className="h-4 w-4" /> Back to Class Dashboard
          </Link>
        </Button>

        <div className="brand-gradient text-primary-foreground rounded-3xl p-6 shadow-lift sm:p-8">
          <Badge className="bg-primary-foreground/20 text-primary-foreground">
            Class {classData?.class_level}
          </Badge>
          <h1 className="text-3xl font-bold mt-2">{classData?.name} — Class Analytics</h1>
          <p className="text-sm opacity-90 mt-1">
            Aggregated class scores, weak topics, score distribution, and teacher intelligence.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-5 shadow-soft">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Class Average</p>
          <p className="text-3xl font-bold mt-1 text-primary">{classAvgPercentage}%</p>
        </Card>

        <Card className="p-5 shadow-soft">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Enrolled Students</p>
          <p className="text-3xl font-bold mt-1">{classStudents.length}</p>
        </Card>

        <Card className="p-5 shadow-soft">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Pass Rate (≥60%)</p>
          <p className="text-3xl font-bold mt-1 text-success">{passRate}%</p>
        </Card>

        <Card className="p-5 shadow-soft">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Total Submissions</p>
          <p className="text-3xl font-bold mt-1">{totalSubmissions}</p>
        </Card>
      </div>

      {/* AIMS AI Class Intelligence */}
      <AimsAiAnalysisCard report={aiReport || null} isLoading={isAiLoading} />

      {/* Score Distribution Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> Class Score Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: "90% – 100% (Outstanding)", count: dist.top, tone: "bg-success" },
              { label: "80% – 89% (Strong)", count: dist.high, tone: "bg-primary" },
              { label: "70% – 79% (Average)", count: dist.mid, tone: "bg-info" },
              { label: "60% – 69% (Passing)", count: dist.pass, tone: "bg-warning" },
              { label: "Below 60% (Needs Practice)", count: dist.low, tone: "bg-destructive" },
            ].map((b) => (
              <div key={b.label} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span>{b.label}</span>
                  <span>{b.count} Student(s)</span>
                </div>
                <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    style={{
                      width: `${totalSubmissions > 0 ? (b.count / totalSubmissions) * 100 : 0}%`,
                    }}
                    className={`h-full ${b.tone} transition-all`}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
