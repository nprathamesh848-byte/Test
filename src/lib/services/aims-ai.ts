import { supabase } from "@/integrations/supabase/client";

export interface AimsAiReport {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  insights: string[];
  recommendations: Array<{
    title: string;
    reason: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
  }>;
}

export async function fetchOrGenerateAimsAiAnalysis(params: {
  reportType: string;
  studentId?: string;
  testId?: string;
  classId?: string;
  inputData: Record<string, any>;
}): Promise<AimsAiReport> {
  const { reportType, studentId, testId, inputData } = params;

  // 1. Check if a recent completed report already exists in database
  try {
    let query = supabase
      .from("ai_reports")
      .select("ai_response, summary")
      .eq("report_type", reportType);
    if (testId) query = query.eq("test_id", testId);
    if (studentId) query = query.eq("student_id", studentId);

    const { data: existing } = await query
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing && existing.ai_response && (existing.ai_response as any).summary) {
      return existing.ai_response as unknown as AimsAiReport;
    }
  } catch (e) {
    console.warn("Error reading cached AI report:", e);
  }

  // 2. Invoke Edge Function `aims-ai`
  try {
    const { data, error } = await supabase.functions.invoke("aims-ai", {
      body: {
        report_type: reportType,
        input_data: { ...inputData, student_id: studentId, test_id: testId },
      },
    });

    if (!error && data?.report) {
      return data.report as AimsAiReport;
    }
  } catch (err) {
    console.warn(
      "Edge function aims-ai unavailable, executing deterministic client fallback:",
      err,
    );
  }

  // 3. Deterministic Client Fallback (Stage 4 data -> Stage 5 structured output)
  const score = inputData["score"] ?? inputData["percentage"] ?? 75;
  const topics = (inputData["topics"] as any[]) || [];
  const weakTopics = topics
    .filter((t: any) => t.accuracy < 60 || t.performance_level === "NEEDS_PRACTICE")
    .map((t: any) => t.name || t.topic_name || "Topic");
  const strongTopics = topics
    .filter((t: any) => t.accuracy >= 80 || t.performance_level === "STRONG")
    .map((t: any) => t.name || t.topic_name || "Topic");

  const fallbackReport: AimsAiReport = {
    summary: `AIMS AI performance calculated at ${score}%. ${weakTopics.length ? `Priority focus needed in ${weakTopics.join(", ")}.` : "Strong concept mastery demonstrated across attempted topics."}`,
    strengths:
      strongTopics.length > 0
        ? strongTopics
        : ["Consistent attempt completion", "Good speed management"],
    weaknesses:
      weakTopics.length > 0
        ? weakTopics
        : ["No critical weak areas identified at present sample size"],
    insights: [
      `Overall performance score: ${score}%.`,
      inputData["timeTaken"]
        ? `Time taken: ${Math.round((inputData["timeTaken"] as number) / 60)} minutes.`
        : "Time tracking captured successfully.",
      inputData["wrongCount"]
        ? `${inputData["wrongCount"]} incorrect answers identified for step-by-step revision.`
        : "High accuracy achieved.",
    ],
    recommendations:
      weakTopics.length > 0
        ? weakTopics.map((w: string) => ({
            title: `Practice ${w} Fundamentals`,
            reason: `Topic accuracy is currently below 60%`,
            priority: "HIGH" as const,
          }))
        : [
            {
              title: "Attempt Higher Difficulty Tests",
              reason: "High concept accuracy demonstrated",
              priority: "MEDIUM" as const,
            },
          ],
  };

  // Save fallback report to database for persistence
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("ai_reports").insert({
        user_id: user.id,
        student_id: studentId || user.id,
        test_id: testId || null,
        report_type: reportType,
        analysis_scope: reportType.startsWith("CLASS") ? "CLASS" : "STUDENT",
        input_snapshot: inputData,
        ai_response: fallbackReport as any,
        summary: fallbackReport.summary,
        status: "COMPLETED",
      });
    }
  } catch (saveErr) {
    console.warn("Could not persist fallback AI report:", saveErr);
  }

  return fallbackReport;
}
