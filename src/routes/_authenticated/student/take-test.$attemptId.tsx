import { useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Clock, ChevronLeft, ChevronRight, Send, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/student/take-test/$attemptId")({
  head: () => ({ meta: [{ title: "Test Room — AIMS AI" }] }),
  component: TakeTestRoomPage,
});

function TakeTestRoomPage() {
  const { attemptId } = Route.useParams();
  const navigate = useNavigate();

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answersMap, setAnswersMap] = useState<Record<string, string>>({}); // test_question_id -> selected_option_id
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);

  // Fetch attempt details & questions
  const { data: attemptData, isLoading } = useQuery({
    queryKey: ["take-test-attempt", attemptId],
    queryFn: async () => {
      const { data: attempt, error: attErr } = await supabase
        .from("test_attempts")
        .select("*, tests(*)")
        .eq("id", attemptId)
        .single();
      if (attErr) throw attErr;

      // Fetch test questions
      const { data: testQuestions, error: tqErr } = await supabase
        .from("test_questions")
        .select("*")
        .eq("test_id", attempt.test_id)
        .order("question_order", { ascending: true });
      if (tqErr) throw tqErr;

      // Fetch existing saved question_attempts
      const { data: existingAnswers } = await supabase
        .from("question_attempts")
        .select("*")
        .eq("attempt_id", attemptId);

      const map: Record<string, string> = {};
      existingAnswers?.forEach((ans) => {
        if (ans.selected_option_id) {
          map[ans.test_question_id] = ans.selected_option_id;
        }
      });
      setAnswersMap(map);

      return { attempt: attempt as any, testQuestions: testQuestions || [] };
    },
  });

  // Calculate timer based on expires_at
  useEffect(() => {
    if (!attemptData?.attempt?.expires_at) return;
    const expiresAtMs = new Date(attemptData.attempt.expires_at).getTime();

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        toast.warning("Time is up! Submitting your test automatically...");
        submitTestMutation.mutate(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [attemptData]);

  // Debounced bulk save mutation (uses new RPC)
  const bulkSaveMutation = useMutation({
    mutationFn: async (answers: Record<string, string>) => {
      const { error } = await supabase.rpc('save_answers_bulk', {
        attempt_id: attemptId,
        answers: answers,
      });
      if (error) throw error;
    },
  });

  // Ref to hold pending answers and timer
  const pendingAnswersRef = useRef<Record<string, string>>({});
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const scheduleBulkSave = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      const payload = { ...pendingAnswersRef.current };
      pendingAnswersRef.current = {};
      bulkSaveMutation.mutate(payload);
    }, 1500);
  };

  // Submit test RPC mutation
  const submitTestMutation = useMutation({
    mutationFn: async (isAutoSubmit: boolean = false) => {
      const { data, error } = await supabase.rpc('submit_test_attempt', {
        p_attempt_id: attemptId,
        p_is_auto_submit: isAutoSubmit,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Test submitted successfully!');
      void navigate({ to: '/student/test-result/$attemptId', params: { attemptId } });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to submit test');
    },
  });

  if (isLoading || !attemptData) {
    return <Skeleton className="h-96 rounded-3xl" />;
  }

  const { attempt, testQuestions } = attemptData;
  const currentTQ = testQuestions[currentIdx];
  const snapshot = (currentTQ?.question_snapshot as any) || {};

  const formatTimer = (secs: number | null) => {
    if (secs === null) return "--:--";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleOptionSelect = (optId: string) => {
    if (!currentTQ) return;
    const updated = { ...answersMap, [currentTQ.id]: optId };
    setAnswersMap(updated);
    // Add to pending answers and schedule bulk save
    pendingAnswersRef.current[currentTQ.id] = optId;
    scheduleBulkSave();
  };

  const answeredCount = Object.keys(answersMap).length;
  const totalCount = testQuestions.length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Timer & Progress Bar */}
      <div className="brand-gradient text-primary-foreground rounded-2xl p-4 flex items-center justify-between shadow-lift sticky top-4 z-20">
        <div>
          <p className="text-xs font-semibold uppercase opacity-80">{attempt.tests?.title}</p>
          <p className="text-sm font-bold mt-0.5">
            Question {currentIdx + 1} of {totalCount}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-primary-foreground/20 px-3 py-1.5 rounded-full font-mono font-bold text-sm">
            <Clock className="h-4 w-4 animate-pulse text-warning" /> {formatTimer(secondsLeft)}
          </div>
          <Button
            size="sm"
            onClick={() => setIsSubmitConfirmOpen(true)}
            className="bg-success text-success-foreground hover:bg-success/90 font-bold"
          >
            Submit Test
          </Button>
        </div>
      </div>

      {/* Main Question Card */}
      <Card className="border-2 shadow-lift">
        <CardHeader className="pb-3 flex flex-row items-center justify-between border-b">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Q{currentIdx + 1}</Badge>
            <Badge
              className={
                snapshot.difficulty === "EASY"
                  ? "bg-success/20 text-success"
                  : "bg-warning/20 text-warning"
              }
            >
              {snapshot.difficulty || "MEDIUM"}
            </Badge>
          </div>
          <span className="text-xs font-bold text-muted-foreground">
            {currentTQ?.marks ?? 0} Mark(s)
          </span>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <p className="text-xl font-semibold text-foreground leading-relaxed">
            {snapshot.question_text || "Question prompt..."}
          </p>

          {/* Options List */}
          <div className="space-y-3">
            {snapshot.options?.map((opt: any, idx: number) => {
              const isSelected = currentTQ ? answersMap[currentTQ.id] === opt.id : false;
              return (
                <div
                  key={opt.id}
                  onClick={() => handleOptionSelect(opt.id)}
                  className={`p-4 rounded-2xl border-2 flex items-center gap-3 cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 font-bold shadow-soft"
                      : "border-border hover:border-primary/40 hover:bg-muted/30"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-base text-foreground">{opt.option_text}</span>
                </div>
              );
            })}
          </div>

          {/* Previous / Next Controls */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx(currentIdx - 1)}
              className="gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>

            <Button
              disabled={currentIdx === totalCount - 1}
              onClick={() => setCurrentIdx(currentIdx + 1)}
              className="gap-1.5"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Question Navigator */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Question Navigator ({answeredCount} / {totalCount} Answered)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {testQuestions.map((q, idx) => {
              const isAns = !!answersMap[q.id];
              const isCurr = idx === currentIdx;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={`h-9 w-9 rounded-xl text-xs font-bold transition-all ${
                    isCurr
                      ? "ring-2 ring-primary ring-offset-2 bg-primary text-primary-foreground"
                      : isAns
                        ? "bg-success text-success-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Submit Confirmation Dialog */}
      <Dialog open={isSubmitConfirmOpen} onOpenChange={setIsSubmitConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Submit Test Confirmation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <p className="text-muted-foreground">
              Are you sure you want to finish and submit your test?
            </p>
            <div className="p-4 rounded-2xl bg-muted/40 space-y-1.5 text-xs font-semibold">
              <p className="text-success flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Answered: {answeredCount} Questions
              </p>
              <p className="text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-warning" /> Unanswered:{" "}
                {totalCount - answeredCount} Questions
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubmitConfirmOpen(false)}>
              Continue Test
            </Button>
            <Button
              className="bg-success text-success-foreground hover:bg-success/90 font-bold"
              onClick={() => submitTestMutation.mutate(false)}
              disabled={submitTestMutation.isPending}
            >
              {submitTestMutation.isPending ? "Submitting..." : "Yes, Submit Test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
