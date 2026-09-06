import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ChevronRight, Clock, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PerformanceBadge } from "@/components/shared/PerformanceBadge";
import { ErrorRetry } from "@/components/shared/ErrorRetry";
import { formatDuration } from "@/lib/performance";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";

const PAGE_SIZE = 10;

export const Route = createFileRoute("/_authenticated/student/history")({
  head: () => ({ meta: [{ title: "Test History — AIMS AI" }] }),
  component: StudentHistoryPage,
});

function StudentHistoryPage() {
  const { currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const {
    data: attempts = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["student-history", currentUser?.id],
    enabled: !!currentUser,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_attempts")
        .select(
          "id, test_id, score, total_marks, percentage, correct_count, wrong_count, skipped_count, time_taken_seconds, submitted_at, status, tests(title, subject_id, subjects(name))"
        )
        .eq("student_id", currentUser!.id)
        .in("status", ["SUBMITTED", "AUTO_SUBMITTED"])
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Unique subjects for filter
  const subjects = Array.from(
    new Set(attempts.map((a) => a.tests?.subjects?.name).filter(Boolean))
  );

  // Filter
  const filtered = attempts.filter((a) => {
    const matchSearch = !search || a.tests?.title?.toLowerCase().includes(search.toLowerCase());
    const matchSubject = subjectFilter === "ALL" || a.tests?.subjects?.name === subjectFilter;
    return matchSearch && matchSubject;
  });

  // Paginate
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Test History</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All your completed test attempts with scores, accuracy, and time.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tests..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={subjectFilter} onValueChange={(v) => { setSubjectFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Subjects</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s} value={s!}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorRetry message="Unable to load test history." onRetry={() => void refetch()} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-8 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground opacity-60" />
          <p className="font-bold">No tests found</p>
          <p className="text-sm text-muted-foreground">
            {search || subjectFilter !== "ALL"
              ? "Try adjusting your filters."
              : "Completed tests will appear here."}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-semibold">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </p>
            {paginated.map((att: any) => (
              <div
                key={att.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 hover:bg-muted/20 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm truncate">{att.tests?.title}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Badge variant="outline" className="text-[10px]">{att.tests?.subjects?.name}</Badge>
                    <span>{new Date(att.submitted_at || att.created_at).toLocaleDateString("en-IN")}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(att.time_taken_seconds || 0)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-bold">
                      {att.score} / {att.total_marks}
                    </p>
                    <p className="text-xs text-muted-foreground">{att.percentage}%</p>
                  </div>
                  <PerformanceBadge percentage={att.percentage} />
                  <Button asChild variant="outline" size="sm" className="gap-1">
                    <Link to="/student/test-result/$attemptId" params={{ attemptId: att.id }}>
                      View <ChevronRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
