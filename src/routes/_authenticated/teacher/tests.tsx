import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  BookOpen,
  Clock,
  CheckCircle,
  Users,
  BarChart3,
  Archive,
  Eye,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/_authenticated/teacher/tests")({
  head: () => ({ meta: [{ title: "Test Management — AIMS AI" }] }),
  component: TeacherTestsPage,
});

function TeacherTestsPage() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ["teacher-tests", currentUser?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tests")
        .select("*, subjects(name), test_assignments(count), test_attempts(count)")
        .eq("created_by", currentUser!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (testId: string) => {
      const { error } = await supabase
        .from("tests")
        .update({ status: "PUBLISHED" })
        .eq("id", testId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Test published!");
      void queryClient.invalidateQueries({ queryKey: ["teacher-tests"] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (testId: string) => {
      const { error } = await supabase
        .from("tests")
        .update({ status: "ARCHIVED" })
        .eq("id", testId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Test archived");
      void queryClient.invalidateQueries({ queryKey: ["teacher-tests"] });
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Test Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create assessments, select questions from your Question Bank, assign to classes, and
            view student scores.
          </p>
        </div>
        <Button asChild className="brand-gradient text-primary-foreground gap-2">
          <Link to="/teacher/create-test">
            <Plus className="h-4 w-4" /> Create Test
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : tests.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-bold">No tests created yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Click "Create Test" to build your first assessment from the Question Bank.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tests.map((test) => (
            <Card key={test.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline">Class {test.class_level}</Badge>
                    <Badge className="bg-secondary text-secondary-foreground">
                      {test.subjects?.name || "Subject"}
                    </Badge>
                    <Badge
                      className={
                        test.status === "PUBLISHED"
                          ? "bg-success text-success-foreground font-semibold"
                          : test.status === "DRAFT"
                            ? "bg-warning text-warning-foreground"
                            : "bg-muted text-muted-foreground"
                      }
                    >
                      {test.status}
                    </Badge>
                  </div>

                  <h3 className="text-xl font-bold text-foreground">{test.title}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-semibold text-foreground">
                      <Clock className="h-3.5 w-3.5" /> {test.duration_minutes} mins
                    </span>
                    <span>Total Marks: {test.total_marks}</span>
                    <span>Assigned: {test.test_assignments?.[0]?.count ?? 0}</span>
                    <span>Submissions: {test.test_attempts?.[0]?.count ?? 0}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {test.status === "DRAFT" && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => publishMutation.mutate(test.id)}
                      className="gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" /> Publish
                    </Button>
                  )}
                  <Button size="sm" variant="outline" asChild className="gap-1.5">
                    <Link to="/teacher/test/$testId/results" params={{ testId: test.id }}>
                      <BarChart3 className="h-3.5 w-3.5" /> Submissions
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => archiveMutation.mutate(test.id)}
                    title="Archive"
                  >
                    <Archive className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
