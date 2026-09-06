import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  HelpCircle,
  Save,
  Send,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/_authenticated/teacher/create-test")({
  head: () => ({ meta: [{ title: "Create Test Wizard — AIMS AI" }] }),
  component: CreateTestPage,
});

function CreateTestPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 Form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classLevel, setClassLevel] = useState<number>(7);
  const [subjectId, setSubjectId] = useState("");
  const [instructions, setInstructions] = useState(
    "Read each question carefully before answering.",
  );
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [passingMarks, setPassingMarks] = useState(10);

  // Step 2 Form (Selected Questions)
  const [selectedQuestions, setSelectedQuestions] = useState<any[]>([]);

  // Step 3 Form (Settings & Assignment)
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [showResultImmediately, setShowResultImmediately] = useState(true);
  const [allowRetake, setAllowRetake] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [assignedClassId, setAssignedClassId] = useState<string>("");

  // Fetch active subjects for the selected class level
  const {
    data: subjects = [],
    isLoading: subjectsLoading,
    isError: subjectsError,
    refetch: refetchSubjects,
  } = useQuery({
    queryKey: ["subjects", classLevel],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("class_level", classLevel)
        .eq("status", "ACTIVE")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch questions from Question Bank matching class & subject
  const { data: bankQuestions = [] } = useQuery({
    queryKey: ["bank-questions", classLevel, subjectId],
    enabled: step === 2 && !!subjectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("*, topics(name), question_options(*)")
        .eq("class_level", classLevel)
        .eq("subject_id", subjectId)
        .eq("status", "ACTIVE");
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Fetch classes teacher manages
  const { data: teacherClasses = [] } = useQuery({
    queryKey: ["teacher-classes", currentUser?.id],
    enabled: step === 3,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("class_level", classLevel);
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate live total marks
  const totalMarks = selectedQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);

  const saveTestMutation = useMutation({
    mutationFn: async (shouldPublish: boolean) => {
      if (!title.trim()) throw new Error("Test title is required");
      if (selectedQuestions.length === 0)
        throw new Error("Please add at least 1 question to the test");

      // 1. Create Test
      const { data: newTest, error: testErr } = await supabase
        .from("tests")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          class_level: classLevel,
          subject_id: subjectId,
          instructions: instructions.trim() || null,
          duration_minutes: durationMinutes,
          total_marks: totalMarks,
          passing_marks: Math.min(passingMarks, totalMarks),
          shuffle_questions: shuffleQuestions,
          shuffle_options: shuffleOptions,
          show_result_immediately: showResultImmediately,
          allow_retake: allowRetake,
          max_attempts: maxAttempts,
          status: shouldPublish ? "PUBLISHED" : "DRAFT",
          created_by: currentUser!.id,
        })
        .select()
        .single();

      if (testErr) throw testErr;

      // 2. Insert Test Questions with snapshots
      const testQuestionRows = selectedQuestions.map((q, idx) => ({
        test_id: newTest.id,
        question_id: q.id,
        question_order: idx + 1,
        marks: q.marks,
        question_snapshot: {
          question_text: q.question_text,
          question_type: q.question_type,
          difficulty: q.difficulty,
          marks: q.marks,
          explanation: q.explanation,
          options: q.question_options?.map((opt: any) => ({
            id: opt.id,
            option_text: opt.option_text,
            option_order: opt.option_order,
            is_correct: opt.is_correct,
          })),
        },
      }));

      const { error: tqErr } = await supabase.from("test_questions").insert(testQuestionRows);
      if (tqErr) throw tqErr;

      // 3. Assign test to students of selected class if assigned
      if (assignedClassId) {
        const { data: classStudents } = await supabase
          .from("class_students")
          .select("student_id")
          .eq("class_id", assignedClassId);

        if (classStudents && classStudents.length > 0) {
          const assignments = classStudents.map((cs) => ({
            test_id: newTest.id,
            student_id: cs.student_id,
            class_id: assignedClassId,
            assigned_by: currentUser!.id,
            status: "ASSIGNED",
          }));
          await supabase.from("test_assignments").insert(assignments);
        }
      }

      return newTest;
    },
    onSuccess: (_, shouldPublish) => {
      toast.success(shouldPublish ? "Test published & assigned!" : "Test saved as Draft!");
      void navigate({ to: "/teacher/tests" });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save test");
    },
  });

  const toggleQuestionSelection = (q: any) => {
    if (selectedQuestions.some((sq) => sq.id === q.id)) {
      setSelectedQuestions(selectedQuestions.filter((sq) => sq.id !== q.id));
    } else {
      setSelectedQuestions([...selectedQuestions, q]);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header Wizard Steps */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold">Create Assessment</h1>
          <p className="text-xs text-muted-foreground">Step {step} of 3</p>
        </div>
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <span
              key={s}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                step === s
                  ? "brand-gradient text-primary-foreground"
                  : step > s
                    ? "bg-success text-success-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {step > s ? <Check className="h-4 w-4" /> : s}
            </span>
          ))}
        </div>
      </div>

      {/* Step 1: Basic Information */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">Step 1 — Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Test Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Class 7 Mathematics Unit Test 1"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Class Level</Label>
                <Select
                  value={classLevel.toString()}
                  onValueChange={(v) => {
                    setClassLevel(parseInt(v));
                    setSubjectId("");
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((cl) => (
                      <SelectItem key={cl} value={cl.toString()}>
                        Class {cl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Subject</Label>
                {subjectsLoading ? (
                  <div className="mt-1 flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Loading subjects…
                  </div>
                ) : subjectsError ? (
                  <div className="mt-1 rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2">
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      Unable to load subjects.
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void refetchSubjects()}
                      className="mt-1 h-7 gap-1.5 text-xs"
                    >
                      <RefreshCw className="h-3 w-3" /> Try again
                    </Button>
                  </div>
                ) : subjects.length === 0 ? (
                  <div className="mt-1 rounded-md border border-amber-500/50 bg-amber-500/5 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                    No subjects available for Class {classLevel}.
                    <br />
                    <span className="text-xs text-muted-foreground">
                      Please ask an administrator to add subjects.
                    </span>
                  </div>
                ) : (
                  <Select value={subjectId} onValueChange={setSubjectId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select Subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duration (Minutes)</Label>
                <Input
                  type="number"
                  min={5}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 30)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Passing Marks</Label>
                <Input
                  type="number"
                  min={1}
                  value={passingMarks}
                  onChange={(e) => setPassingMarks(parseInt(e.target.value) || 10)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Instructions for Students</Label>
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="mt-1 h-20"
              />
            </div>

            <div className="flex items-center justify-between pt-4">
              {!title.trim() || !subjectId || durationMinutes < 5 || passingMarks < 1 ? (
                <p className="text-xs text-muted-foreground">
                  {!title.trim()
                    ? "Enter a test title to continue."
                    : !subjectId
                      ? "Select a subject to continue."
                      : durationMinutes < 5
                        ? "Duration must be at least 5 minutes."
                        : "Passing marks must be at least 1."}
                </p>
              ) : (
                <div />
              )}
              <Button
                disabled={!title.trim() || !subjectId || durationMinutes < 5 || passingMarks < 1}
                onClick={() => setStep(2)}
                className="gap-2"
              >
                Next: Select Questions <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Questions */}
      {step === 2 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold">Step 2 — Select Questions</CardTitle>
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="outline">Selected: {selectedQuestions.length} Questions</Badge>
              <Badge className="bg-primary text-primary-foreground font-bold">
                Total Marks: {totalMarks}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Selected Questions List */}
            {selectedQuestions.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Test Question Paper Order ({selectedQuestions.length})
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedQuestions.map((sq, idx) => (
                    <div
                      key={sq.id}
                      className="p-3 rounded-xl border border-primary/40 bg-primary/5 flex items-center justify-between text-xs"
                    >
                      <span className="font-medium text-foreground flex-1">
                        {idx + 1}. {sq.question_text} ({sq.marks} mark)
                      </span>
                      <Button size="sm" variant="ghost" onClick={() => toggleQuestionSelection(sq)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Question Bank Selection List */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Available Question Bank Items ({bankQuestions.length})
              </p>
              {bankQuestions.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No questions found in Question Bank for this subject. Please add questions to the
                  Question Bank first.
                </p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {bankQuestions.map((q) => {
                    const isSelected = selectedQuestions.some((sq) => sq.id === q.id);
                    return (
                      <div
                        key={q.id}
                        onClick={() => toggleQuestionSelection(q)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer text-xs transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/10 font-semibold"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox checked={isSelected} />
                          <div>
                            <p className="font-medium text-foreground">{q.question_text}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline">{q.topics?.name}</Badge>
                              <Badge variant="secondary">{q.difficulty}</Badge>
                              <span className="text-muted-foreground">{q.marks} mark(s)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Back to Details
              </Button>
              <Button
                disabled={selectedQuestions.length === 0}
                onClick={() => setStep(3)}
                className="gap-2"
              >
                Next: Settings & Assign <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Settings & Assign */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">Step 3 — Test Settings & Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">Shuffle Question Order</p>
                  <p className="text-xs text-muted-foreground">
                    Randomize question order for each student
                  </p>
                </div>
                <Switch checked={shuffleQuestions} onCheckedChange={setShuffleQuestions} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">Show Results Immediately</p>
                  <p className="text-xs text-muted-foreground">
                    Display score and answer explanations right after submission
                  </p>
                </div>
                <Switch
                  checked={showResultImmediately}
                  onCheckedChange={setShowResultImmediately}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">Allow Retakes</p>
                  <p className="text-xs text-muted-foreground">
                    Allow students to retake this test multiple times
                  </p>
                </div>
                <Switch checked={allowRetake} onCheckedChange={setAllowRetake} />
              </div>
            </div>

            <div>
              <Label>Assign to Class Roster</Label>
              <Select value={assignedClassId} onValueChange={setAssignedClassId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select Class to Assign" />
                </SelectTrigger>
                <SelectContent>
                  {teacherClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} ({cls.academic_year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Back to Questions
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => saveTestMutation.mutate(false)}
                  disabled={saveTestMutation.isPending}
                  className="gap-1.5"
                >
                  <Save className="h-4 w-4" /> Save Draft
                </Button>
                <Button
                  onClick={() => saveTestMutation.mutate(true)}
                  disabled={saveTestMutation.isPending}
                  className="brand-gradient text-primary-foreground gap-1.5"
                >
                  <Send className="h-4 w-4" /> Publish & Assign
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
