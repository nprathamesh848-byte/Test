import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
  AlertTriangle,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PerformanceBadge } from "@/components/shared/PerformanceBadge";
import { ErrorRetry } from "@/components/shared/ErrorRetry";
import { supabase } from "@/integrations/supabase/client";

const PAGE_SIZE = 15;

export const Route = createFileRoute("/_authenticated/teacher/class/$classId/students")({
  head: () => ({ meta: [{ title: "Student Performance — AIMS AI" }] }),
  component: ClassStudentsPage,
});

function ClassStudentsPage() {
  const { classId } = Route.useParams();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "avg" | "tests">("avg");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const { data: classData } = useQuery({
    queryKey: ["class-info", classId],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("*").eq("id", classId).single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch class students with their aggregate performance
  const {
    data: rawStudents = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["class-student-stats", classId],
    queryFn: async () => {
      // Get all students in the class
      const { data: classStudents, error: csErr } = await supabase
        .from("class_students")
        .select("student_id, profiles:student_id(full_name, email)")
        .eq("class_id", classId);
      if (csErr) throw csErr;

      if (!classStudents || classStudents.length === 0) return [];

      const studentIds = classStudents.map((cs) => cs.student_id);

      // Get attempts for all students in this class
      const { data: attempts } = await supabase
        .from("test_attempts")
        .select("student_id, percentage, correct_count, wrong_count, skipped_count, submitted_at")
        .in("student_id", studentIds)
        .in("status", ["SUBMITTED", "AUTO_SUBMITTED"]);

      // Aggregate per student
      const attemptMap = new Map<string, { total: number; count: number; correct: number; wrong: number; last: string | null }>();
      for (const att of attempts || []) {
        const e = attemptMap.get(att.student_id) ?? { total: 0, count: 0, correct: 0, wrong: 0, last: null };
        e.total += att.percentage ?? 0;
        e.count += 1;
        e.correct += att.correct_count ?? 0;
        e.wrong += att.wrong_count ?? 0;
        if (!e.last || (att.submitted_at ?? '') > e.last) e.last = att.submitted_at ?? null;
        attemptMap.set(att.student_id, e);
      }

      return classStudents.map((cs: any) => {
        const agg = attemptMap.get(cs.student_id);
        const avgPct = agg && agg.count > 0 ? Math.round(agg.total / agg.count) : null;
        const accuracy = agg ? (agg.correct + agg.wrong > 0 ? Math.round((agg.correct / (agg.correct + agg.wrong)) * 100) : null) : null;
        return {
          id: cs.student_id,
          name: cs.profiles?.full_name ?? "Student",
          email: cs.profiles?.email ?? "",
          avgPct,
          accuracy,
          testsCompleted: agg?.count ?? 0,
          lastActive: agg?.last ?? null,
        };
      });
    },
  });

  // Filter + sort + paginate
  const filtered = rawStudents.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    let va: any, vb: any;
    if (sortBy === "name") { va = a.name; vb = b.name; }
    else if (sortBy === "avg") { va = a.avgPct ?? -1; vb = b.avgPct ?? -1; }
    else { va = a.testsCompleted; vb = b.testsCompleted; }
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(col: "name" | "avg" | "tests") {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("desc"); }
  }

  const studentsNeedingAttention = filtered.filter((s) => s.avgPct !== null && s.avgPct < 60).length;

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 gap-1">
          <Link to="/teacher/class/$classId" params={{ classId }}>
            <ChevronLeft className="h-4 w-4" /> Back to {classData?.name ?? "Class"}
          </Link>
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Student Performance</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {classData?.name} · {filtered.length} students
              {studentsNeedingAttention > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-destructive font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {studentsNeedingAttention} need{studentsNeedingAttention === 1 ? "s" : ""} attention
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search students..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      ) : error ? (
        <ErrorRetry message="Unable to load student data." onRetry={() => void refetch()} />
      ) : paginated.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
          <p className="font-bold">No students found</p>
        </div>
      ) : (
        <>
          {/* Header row */}
          <div className="hidden sm:flex items-center gap-4 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <button className="flex-1 text-left hover:text-foreground" onClick={() => toggleSort("name")}>
              Student {sortBy === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}
            </button>
            <button className="w-24 text-center hover:text-foreground" onClick={() => toggleSort("avg")}>
              Avg % {sortBy === "avg" ? (sortDir === "asc" ? "↑" : "↓") : ""}
            </button>
            <span className="w-20 text-center">Accuracy</span>
            <button className="w-16 text-center hover:text-foreground" onClick={() => toggleSort("tests")}>
              Tests {sortBy === "tests" ? (sortDir === "asc" ? "↑" : "↓") : ""}
            </button>
            <span className="w-32 text-center">Status</span>
            <span className="w-20 text-center">Action</span>
          </div>

          <div className="space-y-2">
            {paginated.map((s) => (
              <div
                key={s.id}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:bg-muted/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <div className="w-24 text-center">
                    {s.avgPct !== null ? (
                      <span className={`font-bold text-lg ${s.avgPct >= 80 ? "text-success" : s.avgPct >= 60 ? "text-info" : "text-destructive"}`}>
                        {s.avgPct}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">No tests</span>
                    )}
                  </div>
                  <div className="w-20 text-center text-muted-foreground text-xs">
                    {s.accuracy !== null ? `${s.accuracy}%` : "—"}
                  </div>
                  <div className="w-16 text-center text-muted-foreground text-xs">
                    {s.testsCompleted}
                  </div>
                  <div className="w-32 text-center">
                    <PerformanceBadge percentage={s.avgPct} />
                  </div>
                  <Button asChild variant="outline" size="sm" className="gap-1 w-20">
                    <Link to="/teacher/student/$studentId" params={{ studentId: s.id }}>
                      View <ChevronRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
