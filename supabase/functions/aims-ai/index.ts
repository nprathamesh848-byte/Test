import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { report_type = "STUDENT_TEST_ANALYSIS", input_data = {} } = body;

    // Check environment key
    const apiKey = Deno.env.get("AI_API_KEY") || Deno.env.get("GEMINI_API_KEY");

    let aiResult: any;

    if (apiKey) {
      // Direct call to Gemini 1.5/2.0 REST endpoint securely from backend Edge Function
      const promptText = `You are AIMS AI, an encouraging and precise educational intelligence assistant for Class 1-10 students and teachers.
Analyze the following JSON performance data:
${JSON.stringify(input_data, null, 2)}

Produce a structured JSON response matching this schema strictly (do NOT include any markdown codeblocks or outer text, ONLY raw JSON):
{
  "summary": "Concise 1-2 sentence overall statement",
  "strengths": ["Strength point 1", "Strength point 2"],
  "weaknesses": ["Area needing practice 1", "Area needing practice 2"],
  "insights": ["Key factual observation from time or accuracy data"],
  "recommendations": [
    {
      "title": "Actionable practice step title",
      "reason": "Why this is recommended based on data",
      "priority": "HIGH" | "MEDIUM" | "LOW"
    }
  ]
}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        },
      );

      if (res.ok) {
        const json = await res.json();
        const textContent = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textContent) {
          try {
            aiResult = JSON.parse(textContent);
          } catch {
            // fallback if raw text returned
            aiResult = {
              summary: textContent,
              strengths: [],
              weaknesses: [],
              insights: [],
              recommendations: [],
            };
          }
        }
      }
    }

    // Fallback deterministic analysis if AI key unavailable or provider call failed
    if (!aiResult || !aiResult.summary) {
      const score = input_data.score ?? input_data.percentage ?? 75;
      const topics = input_data.topics || [];
      const weakTopics = topics
        .filter((t: any) => t.accuracy < 60 || t.performance_level === "NEEDS_PRACTICE")
        .map((t: any) => t.name || t.topic_name);
      const strongTopics = topics
        .filter((t: any) => t.accuracy >= 80 || t.performance_level === "STRONG")
        .map((t: any) => t.name || t.topic_name);

      aiResult = {
        summary: `Performance calculated at ${score}%. ${weakTopics.length ? `Priority focus needed in ${weakTopics.join(", ")}.` : "Consistent performance across attempted topics."}`,
        strengths: strongTopics.length ? strongTopics : ["Active engagement and test completion"],
        weaknesses: weakTopics.length ? weakTopics : ["None identified at current sample size"],
        insights: [
          `Overall accuracy level is ${score}%.`,
          input_data.avg_time
            ? `Average time per question was ${input_data.avg_time} seconds.`
            : "Time tracking active.",
        ],
        recommendations: weakTopics.length
          ? weakTopics.map((tw: string) => ({
              title: `Practice ${tw} Fundamentals`,
              reason: `Topic accuracy is below 60%`,
              priority: "HIGH",
            }))
          : [
              {
                title: "Attempt Advanced Test Questions",
                reason: "High overall topic accuracy",
                priority: "MEDIUM",
              },
            ],
      };
    }

    // Persist report into ai_reports table
    await supabase.from("ai_reports").insert({
      user_id: user.id,
      student_id: input_data.student_id || user.id,
      test_id: input_data.test_id || null,
      report_type,
      analysis_scope: report_type.startsWith("CLASS") ? "CLASS" : "STUDENT",
      input_snapshot: input_data,
      ai_response: aiResult,
      summary: aiResult.summary || "AIMS AI Analysis Complete",
      status: "COMPLETED",
    });

    return new Response(JSON.stringify({ success: true, report: aiResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Edge function processing error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
