import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Clock, Play, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/_authenticated/student/tests")({
  head: () => ({ meta: [{ title: "My Tests — AIMS AI" }] }),
  component: StudentTestsPage,
});

function StudentTestsPage() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch student profile for class_level
  const { data: studentData } = useQuery({
    queryKey: ["student-profile", currentUser?.id],
    enabled: !!currentUser,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("class_level")
        .eq("user_id", currentUser!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch assigned tests
  const { data: assignments = [], isLoading: isAssignmentsLoading } = useQuery({
    queryKey: ["student-assignments", currentUser?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_assignments")
        .select("*, tests(*, subjects(name))")
        .eq("student_id", currentUser!.id);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Fetch class-level published tests (tests available for student's class)
  const { data: classTests = [], isLoading: isClassTestsLoading } = useQuery({
    queryKey: ["student-class-tests-page", currentUser?.id, studentData?.class_level],
    enabled: !!currentUser && !!studentData?.class_level,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tests")
        .select("id, title, duration_minutes, total_marks, class_level, subjects(name)")
        .eq("status", "PUBLISHED")
        .eq("class_level", studentData!.class_level)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Fetch existing attempts
  const { data: attempts = [] } = useQuery({
    queryKey: ["student-attempts", currentUser?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_attempts")
        .select("*, tests(title, duration_minutes, subjects(name))")
        .eq("student_id", currentUser!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Start test from assignment (legacy flow)
  const startTestMutation = useMutation({
    mutationFn: async (assignment: any) => {
      const test = assignment.tests;
      const durationMs = test.duration_minutes * 60 * 1000;
      const expiresAt = new Date(Date.now() + durationMs).toISOString();

      // Check if active IN_PROGRESS attempt exists
      const { data: activeAttempt } = await supabase
        .from("test_attempts")
        .select("*")
        .eq("test_id", test.id)
        .eq("student_id", currentUser!.id)
        .eq("status", "IN_PROGRESS")
        .maybeSingle();

      if (activeAttempt) return activeAttempt;

      // Create new test attempt
      const { data: newAttempt, error } = await supabase
        .from("test_attempts")
        .insert({
          test_id: test.id,
          assignment_id: assignment.id,
          student_id: currentUser!.id,
          attempt_number: 1,
          started_at: new Date().toISOString(),
          expires_at: expiresAt,
          status: "IN_PROGRESS",
        })
        .select()
        .single();

      if (error) throw error;

      // Update assignment status
      await supabase.from("test_assignments").update({ status: "STARTED" }).eq("id", assignment.id);

      return newAttempt;
    },
    onSuccess: (attempt) => {
      toast.success("Test started! Good luck.");
      void navigate({ to: '/student/take-test/$attemptId', params: { attemptId: attempt.id } });
    },
    onError: (err: any) => {
      toast.error(err.message || "Could not start test");
    },
  });

  // Start class test via RPC (auto-creates assignment + attempt)
  const startClassTestMutation = useMutation({
    mutationFn: async (testId: string) => {
      const { data, error } = await supabase.rpc('start_class_test', {
        p_test_id: testId,
      });
      if (error) throw error;
      return data as { attempt_id: string; resumed: boolean };
    },
    onSuccess: (data) => {
      toast.success(data.resumed ? 'Resuming test...' : 'Test started! Good luck.');
      void navigate({ to: '/student/take-test/$attemptId', params: { attemptId: data.attempt_id } });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Could not start test');
    },
  });

  const availableAssignments = assignments.filter(
    (a) => a.status === "ASSIGNED" || a.status === "STARTED",
  );
  const completedAttempts = attempts.filter(
    (a) => a.status === "SUBMITTED" || a.status === "AUTO_SUBMITTED",
  );

  // Class tests not already assigned to this student
  const assignedTestIds = new Set(assignments.map((a: any) => a.tests?.id).filter(Boolean));
  const unassignedClassTests = classTests.filter((t: any) => !assignedTestIds.has(t.id));

  const isLoading = isAssignmentsLoading || isClassTestsLoading;
  const totalAvailable = availableAssignments.length + unassignedClassTests.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">My Tests</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Take assigned assessments, track progress, and review scored test results.
        </p>
      </div>

      <Tabs defaultValue="available" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="available">Available ({totalAvailable})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedAttempts.length})</TabsTrigger>
        </TabsList>

        {/* Available Tests */}
        <TabsContent value="available" className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-40 rounded-2xl" />
          ) : totalAvailable === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
              <h3 className="text-lg font-bold">No tests available right now</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your teacher will assign new assessments here soon!
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Assigned tests */}
              {availableAssignments.map((a) => {
                const test = a.tests;
                return (
                  <Card
                    key={a.id}
                    className="hover:border-primary/40 transition-colors flex flex-col justify-between"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">Class {test.class_level}</Badge>
                        <Badge className="bg-secondary text-secondary-foreground">
                          {test.subjects?.name}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl font-bold mt-2">{test.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-primary" /> {test.duration_minutes}{" "}
                          Minutes
                        </span>
                        <span>Total Marks: {test.total_marks}</span>
                      </div>
                      <Button
                        onClick={() => startTestMutation.mutate(a)}
                        disabled={startTestMutation.isPending}
                        className="w-full brand-gradient text-primary-foreground gap-2"
                      >
                        <Play className="h-4 w-4" /> Start Test
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Class-level tests (not yet assigned) */}
              {unassignedClassTests.map((t: any) => (
                <Card
                  key={t.id}
                  className="hover:border-primary/40 transition-colors flex flex-col justify-between"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">Class {t.class_level}</Badge>
                      <Badge className="bg-secondary text-secondary-foreground">
                        {t.subjects?.name ?? "Subject"}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl font-bold mt-2">{t.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-primary" /> {t.duration_minutes}{" "}
                        Minutes
                      </span>
                      <span>Total Marks: {t.total_marks}</span>
                    </div>
                    <Button
                      onClick={() => startClassTestMutation.mutate(t.id)}
                      disabled={startClassTestMutation.isPending}
                      className="w-full brand-gradient text-primary-foreground gap-2"
                    >
                      <Play className="h-4 w-4" /> Start Test
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Completed Tests */}
        <TabsContent value="completed" className="space-y-4">
          {completedAttempts.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <CheckCircle2 className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
              <h3 className="text-lg font-bold">No completed tests yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Completed test scores and AIMS AI analysis will appear here.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {completedAttempts.map((att) => (
                <Card
                  key={att.id}
                  className="hover:border-primary/40 transition-colors flex flex-col justify-between"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{att.tests?.subjects?.name || "Subject"}</Badge>
                      <Badge
                        className={
                          att.percentage >= 80
                            ? "bg-success text-success-foreground"
                            : att.percentage >= 60
                              ? "bg-warning text-warning-foreground"
                              : "bg-destructive text-destructive-foreground"
                        }
                      >
                        Score: {att.score} / {att.total_marks} ({att.percentage}%)
                      </Badge>
                    </div>
                    <CardTitle className="text-lg font-bold mt-2">{att.tests?.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Submitted: {new Date(att.submitted_at || att.created_at).toLocaleDateString()}
                    </p>
                    <Button asChild variant="outline" className="w-full gap-2">
                      <Link to="/student/test-result/$attemptId" params={{ attemptId: att.id }}>
                        View Result & AIMS AI Analysis <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
