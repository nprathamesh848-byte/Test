import { Sparkles, CheckCircle2, AlertTriangle, Lightbulb, Target, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AimsAiReport } from "@/lib/services/aims-ai";

interface AimsAiAnalysisCardProps {
  report: AimsAiReport | null;
  isLoading?: boolean;
}

export function AimsAiAnalysisCard({ report, isLoading }: AimsAiAnalysisCardProps) {
  if (isLoading) {
    return (
      <Card className="border-accent/40 bg-card shadow-lift">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 animate-pulse text-accent" />
            <p className="text-sm font-medium text-muted-foreground">
              AIMS AI is analyzing performance signals...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!report) return null;

  return (
    <Card className="overflow-hidden border-2 border-accent/40 bg-card shadow-lift">
      <CardHeader className="brand-gradient text-primary-foreground p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-accent" />
            <CardTitle className="text-xl font-bold">AIMS AI Analysis</CardTitle>
          </div>
          <Badge className="bg-accent text-accent-foreground rounded-full px-3 py-1 text-xs font-semibold">
            Assess • Identify • Master
          </Badge>
        </div>
        <p className="mt-2 text-sm opacity-95 leading-relaxed">{report.summary}</p>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Strengths & Weaknesses Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Strengths */}
          <div className="rounded-2xl border border-success/30 bg-success/10 p-4">
            <div className="flex items-center gap-2 font-bold text-success text-sm mb-3">
              <CheckCircle2 className="h-4 w-4" /> Strong Concept Areas
            </div>
            {report.strengths.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Complete more tests to highlight strengths.
              </p>
            ) : (
              <ul className="space-y-1.5 text-xs font-medium text-foreground">
                {report.strengths.map((st, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    {st}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Weaknesses / Needs Practice */}
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
            <div className="flex items-center gap-2 font-bold text-destructive text-sm mb-3">
              <AlertTriangle className="h-4 w-4" /> Priority Practice Areas
            </div>
            {report.weaknesses.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No weak topics detected at current sample size!
              </p>
            ) : (
              <ul className="space-y-1.5 text-xs font-medium text-foreground">
                {report.weaknesses.map((w, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                    {w}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Insights */}
        {report.insights && report.insights.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-warning" /> Key Observations
            </p>
            <div className="grid gap-2 text-xs">
              {report.insights.map((ins, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border bg-muted/30 p-3 text-muted-foreground"
                >
                  {ins}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {report.recommendations && report.recommendations.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-accent" /> Recommended Next Steps
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {report.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-border bg-card p-4 shadow-soft flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-xs text-foreground">{rec.title}</span>
                      <Badge
                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                          rec.priority === "HIGH"
                            ? "bg-destructive text-destructive-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{rec.reason}</p>
                  </div>
                  <div className="mt-3 flex items-center text-[11px] font-semibold text-primary gap-1">
                    Start Practice <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
