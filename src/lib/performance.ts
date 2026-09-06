// Shared performance utilities for Stage 9 dashboards
// Single source of truth for thresholds, labels, and color mapping

export const PERFORMANCE_THRESHOLDS = {
  STRONG: 80,
  AVERAGE: 60,
} as const;

export type PerformanceLevel = "STRONG" | "AVERAGE" | "NEEDS_PRACTICE";

export function getPerformanceLevel(percentage: number | null | undefined): PerformanceLevel {
  if (percentage == null) return "NEEDS_PRACTICE";
  if (percentage >= PERFORMANCE_THRESHOLDS.STRONG) return "STRONG";
  if (percentage >= PERFORMANCE_THRESHOLDS.AVERAGE) return "AVERAGE";
  return "NEEDS_PRACTICE";
}

export const PERFORMANCE_LABELS: Record<PerformanceLevel, string> = {
  STRONG: "Strong",
  AVERAGE: "Average",
  NEEDS_PRACTICE: "Needs Practice",
};

export const PERFORMANCE_COLORS: Record<PerformanceLevel, string> = {
  STRONG: "bg-success text-success-foreground",
  AVERAGE: "bg-info text-info-foreground",
  NEEDS_PRACTICE: "bg-destructive text-destructive-foreground",
};

export const PERFORMANCE_TEXT_COLORS: Record<PerformanceLevel, string> = {
  STRONG: "text-success",
  AVERAGE: "text-info",
  NEEDS_PRACTICE: "text-destructive",
};

/** Derives subject-level performance from a flat list of test_attempts */
export function aggregateSubjectPerformance(
  attempts: Array<{
    percentage: number | null;
    tests?: { subject_id?: string | null; subjects?: { name?: string | null } | null } | null;
  }>
): Array<{ subjectName: string; avgPercentage: number; testCount: number; level: PerformanceLevel }> {
  const subjectMap = new Map<string, { total: number; count: number }>();

  for (const a of attempts) {
    const name = a.tests?.subjects?.name ?? "Other";
    const pct = a.percentage ?? 0;
    const entry = subjectMap.get(name) ?? { total: 0, count: 0 };
    entry.total += pct;
    entry.count += 1;
    subjectMap.set(name, entry);
  }

  return Array.from(subjectMap.entries())
    .map(([subjectName, { total, count }]) => {
      const avgPercentage = Math.round(total / count);
      return { subjectName, avgPercentage, testCount: count, level: getPerformanceLevel(avgPercentage) };
    })
    .sort((a, b) => b.avgPercentage - a.avgPercentage);
}

/** Derives trend data from chronologically sorted attempts */
export function buildTrendData(
  attempts: Array<{ percentage: number | null; submitted_at: string | null; tests?: { title?: string | null } | null }>,
  maxPoints = 10
): Array<{ label: string; percentage: number; index: number }> {
  return attempts
    .slice(-maxPoints)
    .map((a, i) => ({
      label: a.tests?.title ?? `Test ${i + 1}`,
      percentage: Math.round(a.percentage ?? 0),
      index: i + 1,
    }));
}

/** Dynamic greeting based on time of day */
export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Dynamic motivational messages based on recent performance */
export function getMotivationalMessage(avgPercentage: number, testsCompleted: number): string {
  if (testsCompleted === 0) {
    return "Welcome! Start your first test to unlock your personalized performance insights.";
  }
  if (avgPercentage >= 85) {
    return "Outstanding work! You're performing at a high level — keep challenging yourself with harder questions.";
  }
  if (avgPercentage >= 70) {
    return "You're making solid progress. Consistent practice on weaker topics will push your score even higher.";
  }
  if (avgPercentage >= 55) {
    return "Keep going! Every practice session builds stronger foundations. Focus on your AIMS AI recommendations.";
  }
  return "Every expert was once a beginner. Review your mistakes carefully — that's where the real learning happens.";
}

/** Format seconds into readable time string */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

/** Compute accuracy from correct/wrong/skipped counts */
export function computeAccuracy(correct: number, wrong: number, skipped: number): number {
  const answered = correct + wrong;
  if (answered === 0) return 0;
  return Math.round((correct / answered) * 100);
}
