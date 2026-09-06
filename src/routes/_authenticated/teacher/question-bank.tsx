import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  Filter,
  BookOpen,
  Edit,
  Copy,
  Archive,
  Check,
  Eye,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/_authenticated/teacher/question-bank")({
  head: () => ({ meta: [{ title: "Question Bank — AIMS AI" }] }),
  component: QuestionBankPage,
});

function QuestionBankPage() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState<string>("ALL");
  const [subjectFilter, setSubjectFilter] = useState<string>("ALL");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  // Status filters for management UI
  const [subjectStatusFilter, setSubjectStatusFilter] = useState<string>("ACTIVE"); // ACTIVE, INACTIVE, ALL
  const [topicStatusFilter, setTopicStatusFilter] = useState<string>("ACTIVE");

  // Dialog & Drawer state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<any | null>(null);

  // Form state for creation/edit
  const [formClassLevel, setFormClassLevel] = useState<number>(7);
  const [formSubjectId, setFormSubjectId] = useState<string>("");
  const [formTopicId, setFormTopicId] = useState<string>("");
  const [formQuestionType, setFormQuestionType] = useState<"MCQ" | "TRUE_FALSE">("MCQ");
  const [formDifficulty, setFormDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [formMarks, setFormMarks] = useState<number>(1);
  const [formQuestionText, setFormQuestionText] = useState("");
  const [formExplanation, setFormExplanation] = useState("");
  const [formOptions, setFormOptions] = useState([
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);
  // Form fields for subject & topic management
  const [formSubjectName, setFormSubjectName] = useState<string>("");
  const [formSubjectDescription, setFormSubjectDescription] = useState<string>("");
  const [formTopicName, setFormTopicName] = useState<string>("");
  const [formTopicDescription, setFormTopicDescription] = useState<string>("");
  // Editing state
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [editingTopic, setEditingTopic] = useState<any>(null);

  // Fetch subjects for the filter panel (requires classFilter to be set)
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects", classFilter, subjectStatusFilter],
    enabled: classFilter !== "ALL",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("class_level", parseInt(classFilter))
        .eq("status", subjectStatusFilter)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch subjects for the create-question form (always based on formClassLevel)
  const { data: formSubjects = [] } = useQuery({
    queryKey: ["form-subjects", formClassLevel],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("class_level", formClassLevel)
        .eq("status", "ACTIVE")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Updated topics query with status filter
  const { data: topics = [] } = useQuery({
    queryKey: ["topics", formSubjectId, topicStatusFilter],
    enabled: !!formSubjectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topics")
        .select("*")
        .eq("subject_id", formSubjectId)
        .eq("status", topicStatusFilter)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch questions query
  const { data: questionsData, isLoading } = useQuery({
    queryKey: ["questions", searchQuery, classFilter, subjectFilter, difficultyFilter, page],
    queryFn: async () => {
      let q = supabase
        .from("questions")
        .select("*, subjects(name), topics(name), question_options(*)", { count: "exact" })
        .order("created_at", { ascending: false });

      if (classFilter !== "ALL") q = q.eq("class_level", parseInt(classFilter));
      if (subjectFilter !== "ALL") q = q.eq("subject_id", subjectFilter);
      if (difficultyFilter !== "ALL") q = q.eq("difficulty", difficultyFilter);
      if (searchQuery.trim()) q = q.ilike("question_text", `%${searchQuery.trim()}%`);

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, error, count } = await q.range(from, to);
      if (error) throw error;

      return { questions: (data || []) as any[], totalCount: count || 0 };
    },
  });

  // Create Question Mutation
  const createQuestionMutation = useMutation({
    mutationFn: async () => {
      if (!formQuestionText.trim()) throw new Error("Question text is required");
      if (!formSubjectId || !formTopicId) throw new Error("Please select both Subject and Topic");

      if (formQuestionType === "MCQ") {
        const filled = formOptions.filter((o) => o.text.trim());
        if (filled.length < 2) throw new Error("At least 2 options are required for MCQ");
        const hasCorrect = filled.some((o) => o.isCorrect);
        if (!hasCorrect) throw new Error("Please select the correct answer option");
      }

      const { data: newQ, error: qErr } = await supabase
        .from("questions")
        .insert({
          class_level: formClassLevel,
          subject_id: formSubjectId,
          topic_id: formTopicId,
          question_text: formQuestionText.trim(),
          question_type: formQuestionType,
          difficulty: formDifficulty,
          marks: formMarks,
          explanation: formExplanation.trim() || null,
          created_by: currentUser!.id,
          status: "ACTIVE",
        })
        .select()
        .single();

      if (qErr) throw qErr;

      // Insert options
      if (formQuestionType === "MCQ") {
        const optsToInsert = formOptions
          .filter((o) => o.text.trim())
          .map((o, idx) => ({
            question_id: newQ.id,
            option_text: o.text.trim(),
            option_order: idx + 1,
            is_correct: o.isCorrect,
          }));
        const { error: optErr } = await supabase.from("question_options").insert(optsToInsert);
        if (optErr) throw optErr;
      } else {
        const tfOpts = [
          {
            question_id: newQ.id,
            option_text: "True",
            option_order: 1,
            is_correct: formOptions[0]?.isCorrect ?? true,
          },
          {
            question_id: newQ.id,
            option_text: "False",
            option_order: 2,
            is_correct: !(formOptions[0]?.isCorrect ?? true),
          },
        ];
        const { error: optErr } = await supabase.from("question_options").insert(tfOpts);
        if (optErr) throw optErr;
      }

      return newQ;
    },
    onSuccess: () => {
      toast.success("Question saved to Question Bank!");
      setIsCreateOpen(false);
      resetForm();
      void queryClient.invalidateQueries({ queryKey: ["questions"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create question");
    },
  });

  const archiveSubject = async (id: string) => {
    const { error } = await supabase
      .from('subjects')
      .update({ status: 'INACTIVE' })
      .eq('id', id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Subject archived');
      void queryClient.invalidateQueries({ queryKey: ['subjects', classFilter, subjectStatusFilter] });
      void queryClient.invalidateQueries({ queryKey: ['form-subjects', formClassLevel] });
    }
  };
  const archiveTopic = async (id: string) => {
    const { error } = await supabase
      .from('topics')
      .update({ status: 'INACTIVE' })
      .eq('id', id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Topic archived');
      void queryClient.invalidateQueries({ queryKey: ['topics', formSubjectId, topicStatusFilter] });
    }
  };

  // Duplicate a question (copy it with all options)
  const duplicateMutation = useMutation({
    mutationFn: async (q: any) => {
      const { data: newQ, error: qErr } = await supabase
        .from("questions")
        .insert({
          class_level: q.class_level,
          subject_id: q.subject_id,
          topic_id: q.topic_id,
          question_text: `(Copy) ${q.question_text}`,
          question_type: q.question_type,
          difficulty: q.difficulty,
          marks: q.marks,
          explanation: q.explanation,
          created_by: currentUser!.id,
          status: "ACTIVE",
        })
        .select()
        .single();
      if (qErr) throw qErr;
      if (q.question_options && q.question_options.length > 0) {
        const optsToInsert = q.question_options.map((opt: any, idx: number) => ({
          question_id: newQ.id,
          option_text: opt.option_text,
          option_order: opt.option_order ?? idx + 1,
          is_correct: opt.is_correct,
        }));
        const { error: optErr } = await supabase.from("question_options").insert(optsToInsert);
        if (optErr) throw optErr;
      }
      return newQ;
    },
    onSuccess: () => {
      toast.success("Question duplicated!");
      void queryClient.invalidateQueries({ queryKey: ["questions"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to duplicate question");
    },
  });

  // Archive a question from the question bank
  const archiveMutation = useMutation({
    mutationFn: async (questionId: string) => {
      const { error } = await supabase
        .from("questions")
        .update({ status: "ARCHIVED" })
        .eq("id", questionId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Question archived");
      void queryClient.invalidateQueries({ queryKey: ["questions"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to archive question");
    },
  });

  const resetForm = () => {
    setFormQuestionText("");
    setFormExplanation("");
    setFormOptions([
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ]);
  };

  const totalPages = Math.ceil((questionsData?.totalCount || 0) / pageSize);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teacher Question Bank</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create, organize, and preview reusable questions for Class 1 to 10 assessments.
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="brand-gradient text-primary-foreground gap-2">
              <Plus className="h-4 w-4" /> Create Question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Add Question to Question Bank</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Class Level</Label>
                  <Select
                    value={formClassLevel.toString()}
                    onValueChange={(v) => setFormClassLevel(parseInt(v))}
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
                  <Label>Question Type</Label>
                  <Select
                    value={formQuestionType}
                    onValueChange={(v: any) => setFormQuestionType(v)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MCQ">Multiple Choice (MCQ)</SelectItem>
                      <SelectItem value="TRUE_FALSE">True / False</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Subject</Label>
                  <Select value={formSubjectId} onValueChange={setFormSubjectId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select Subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {formSubjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} (Class {s.class_level})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" size="sm" onClick={() => { setIsSubjectModalOpen(true); setEditingSubject(null); }}>
                    + Add Subject
                  </Button>
                </div>
              </div>
              {formClassLevel && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Manage Subjects for Class {formClassLevel}</span>
                    <Button variant="outline" size="sm" onClick={() => { setIsSubjectModalOpen(true); setEditingSubject(null); }}>
                      + Add Subject
                    </Button>
                  </div>
                  {subjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No subjects available. Add a new subject.</p>
                  ) : (
                    <ul className="list-disc pl-5 space-y-1">
                      {subjects.map((s: any) => (
                        <li key={s.id} className="flex items-center justify-between">
                          <span>{s.name}</span>
                          <div className="space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => {
                              setEditingSubject(s);
                              setFormSubjectName(s.name);
                              setFormSubjectDescription(s.description || "");
                              setIsSubjectModalOpen(true);
                            }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => {
                              if (window.confirm(`Archive subject "${s.name}"?`)) archiveSubject(s.id);
                            }}>
                              <Archive className="h-4 w-4" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Topic</Label>
                  <Select
                    value={formTopicId}
                    onValueChange={setFormTopicId}
                    disabled={!formSubjectId}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue
                        placeholder={formSubjectId ? "Select Topic" : "Select Subject first"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {topics.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {formSubjectId && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Manage Topics for Selected Subject</span>
                    <Button variant="outline" size="sm" onClick={() => { setIsTopicModalOpen(true); setEditingTopic(null); }}>
                      + Add Topic
                    </Button>
                  </div>
                  {topics.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No topics available. Add a new topic.</p>
                  ) : (
                    <ul className="list-disc pl-5 space-y-1">
                      {topics.map((t: any) => (
                        <li key={t.id} className="flex items-center justify-between">
                          <span>{t.name}</span>
                          <div className="space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => { setEditingTopic(t); setFormTopicName(t.name); setFormTopicDescription(t.description || ""); setIsTopicModalOpen(true); }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => {
                              if (window.confirm(`Archive topic "${t.name}"?`)) archiveTopic(t.id);
                            }}>
                              <Archive className="h-4 w-4" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Difficulty</Label>
                  <Select value={formDifficulty} onValueChange={(v: any) => setFormDifficulty(v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EASY">Easy</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HARD">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Marks</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={formMarks}
                    onChange={(e) => setFormMarks(parseInt(e.target.value) || 1)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Question Text</Label>
                <Textarea
                  value={formQuestionText}
                  onChange={(e) => setFormQuestionText(e.target.value)}
                  placeholder="Type the question prompt..."
                  className="mt-1 h-24"
                />
              </div>

              {/* Options */}
              {formQuestionType === "MCQ" ? (
                <div className="space-y-3">
                  <Label>Options (Check radio for correct answer)</Label>
                  {formOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correct-option"
                        checked={opt.isCorrect}
                        onChange={() =>
                          setFormOptions(
                            formOptions.map((o, i) => ({ ...o, isCorrect: i === idx })),
                          )
                        }
                        className="h-4 w-4 text-primary"
                      />
                      <Input
                        value={opt.text}
                        onChange={(e) => {
                          const updated = [...formOptions];
                          updated[idx]!.text = e.target.value;
                          setFormOptions(updated);
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Correct Answer</Label>
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant={formOptions[0]?.isCorrect ? "default" : "outline"}
                      onClick={() =>
                        setFormOptions([
                          { text: "True", isCorrect: true },
                          { text: "False", isCorrect: false },
                        ])
                      }
                      className="flex-1"
                    >
                      True
                    </Button>
                    <Button
                      type="button"
                      variant={!(formOptions[0]?.isCorrect ?? true) ? "default" : "outline"}
                      onClick={() =>
                        setFormOptions([
                          { text: "True", isCorrect: false },
                          { text: "False", isCorrect: true },
                        ])
                      }
                      className="flex-1"
                    >
                      False
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <Label>Explanation (Shown during review)</Label>
                <Textarea
                  value={formExplanation}
                  onChange={(e) => setFormExplanation(e.target.value)}
                  placeholder="Explain step-by-step why this answer is correct..."
                  className="mt-1 h-20"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createQuestionMutation.mutate()}
                disabled={createQuestionMutation.isPending}
              >
                {createQuestionMutation.isPending ? "Saving..." : "Save Question"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search questions by text..."
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                value={classFilter}
                onValueChange={(v) => {
                  setClassFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Classes</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((c) => (
                    <SelectItem key={c} value={c.toString()}>
                      Class {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={difficultyFilter}
                onValueChange={(v) => {
                  setDifficultyFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Levels</SelectItem>
                  <SelectItem value="EASY">Easy</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HARD">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : questionsData?.questions.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <HelpCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-bold">No questions found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first question or adjust search filters.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {questionsData?.questions.map((q) => (
            <Card key={q.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-5 flex flex-col sm:flex-row justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline">Class {q.class_level}</Badge>
                    <Badge className="bg-secondary text-secondary-foreground">
                      {q.subjects?.name || "Subject"}
                    </Badge>
                    <Badge variant="secondary">{q.topics?.name || "Topic"}</Badge>
                    <Badge
                      className={
                        q.difficulty === "EASY"
                          ? "bg-success/20 text-success"
                          : q.difficulty === "MEDIUM"
                            ? "bg-warning/20 text-warning"
                            : "bg-destructive/20 text-destructive"
                      }
                    >
                      {q.difficulty}
                    </Badge>
                    <span className="text-muted-foreground font-semibold">{q.marks} mark(s)</span>
                  </div>

                  <p className="font-medium text-base text-foreground line-clamp-2">
                    {q.question_text}
                  </p>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button size="sm" variant="outline" onClick={() => setPreviewQuestion(q)}>
                    <Eye className="h-4 w-4" /> Preview
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Duplicate"
                    onClick={() => duplicateMutation.mutate(q)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Archive"
                    onClick={() => archiveMutation.mutate(q.id)}
                  >
                    <Archive className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-xs text-muted-foreground">
                Showing {(page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, questionsData?.totalCount || 0)} of{" "}
                {questionsData?.totalCount}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subject Management Dialog */}
      <Dialog open={isSubjectModalOpen} onOpenChange={(open) => { setIsSubjectModalOpen(open); if (!open) { setEditingSubject(null); setFormSubjectName(''); setFormSubjectDescription(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{editingSubject ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Class Level *</Label>
                <Select
                  value={formClassLevel.toString()}
                  onValueChange={(v) => setFormClassLevel(parseInt(v))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10].map((cl) => (
                      <SelectItem key={cl} value={cl.toString()}>Class {cl}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={subjectStatusFilter}
                  onValueChange={setSubjectStatusFilter}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Subject Name *</Label>
              <Input value={formSubjectName} onChange={(e) => setFormSubjectName(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={formSubjectDescription} onChange={(e) => setFormSubjectDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubjectModalOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                const dup = subjects.find((s: any) => s.name.toLowerCase() === formSubjectName.trim().toLowerCase() && s.class_level === formClassLevel && (!editingSubject || s.id !== editingSubject.id));
                if (dup) { toast.error('Subject with this name already exists for the selected class'); return; }
                const payload = { class_level: formClassLevel, name: formSubjectName.trim(), description: formSubjectDescription.trim() || null, status: 'ACTIVE' } as any;
                try {
                  if (editingSubject) {
                    const { error } = await supabase.from('subjects').update(payload).eq('id', editingSubject.id);
                    if (error) throw error;
                    toast.success('Subject updated');
                  } else {
                    const { error } = await supabase.from('subjects').insert(payload);
                    if (error) throw error;
                    toast.success('Subject added');
                  }
                  setIsSubjectModalOpen(false);
                  void queryClient.invalidateQueries({ queryKey: ['subjects', classFilter, subjectStatusFilter] });
                } catch (e: any) { toast.error(e.message || 'Failed to save subject'); }
              }}
            >
              {editingSubject ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Topic Management Dialog */}
      <Dialog open={isTopicModalOpen} onOpenChange={(open) => { setIsTopicModalOpen(open); if (!open) { setEditingTopic(null); setFormTopicName(''); setFormTopicDescription(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{editingTopic ? 'Edit Topic' : 'Add Topic'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Class Level *</Label>
                <Select
                  value={formClassLevel.toString()}
                  onValueChange={(v) => setFormClassLevel(parseInt(v))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10].map((cl) => (
                      <SelectItem key={cl} value={cl.toString()}>Class {cl}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subject *</Label>
                <Select value={formSubjectId} onValueChange={setFormSubjectId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} (Class {s.class_level})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={topicStatusFilter}
                onValueChange={setTopicStatusFilter}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Topic Name *</Label>
              <Input value={formTopicName} onChange={(e) => setFormTopicName(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={formTopicDescription} onChange={(e) => setFormTopicDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTopicModalOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!formSubjectId) { toast.error('Select a subject first'); return; }
                const dup = topics.find((t: any) => t.name.toLowerCase() === formTopicName.trim().toLowerCase() && t.subject_id === formSubjectId && (!editingTopic || t.id !== editingTopic.id));
                if (dup) { toast.error('Topic with this name already exists for the selected subject'); return; }
                const payload = { subject_id: formSubjectId, name: formTopicName.trim(), description: formTopicDescription.trim() || null, status: 'ACTIVE' } as any;
                try {
                  if (editingTopic) {
                    const { error } = await supabase.from('topics').update(payload).eq('id', editingTopic.id);
                    if (error) throw error;
                    toast.success('Topic updated');
                  } else {
                    const { error } = await supabase.from('topics').insert(payload);
                    if (error) throw error;
                    toast.success('Topic added');
                  }
                  setIsTopicModalOpen(false);
                  void queryClient.invalidateQueries({ queryKey: ['topics', formSubjectId, topicStatusFilter] });
                } catch (e: any) { toast.error(e.message || 'Failed to save topic'); }
              }}
            >
              {editingTopic ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewQuestion} onOpenChange={() => setPreviewQuestion(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Student Question Preview</DialogTitle>
          </DialogHeader>
          {previewQuestion && (
            <div className="space-y-4 py-2">
              <div className="flex gap-2 text-xs">
                <Badge variant="outline">Class {previewQuestion.class_level}</Badge>
                <Badge>{previewQuestion.subjects?.name}</Badge>
                <Badge variant="secondary">{previewQuestion.difficulty}</Badge>
              </div>
              <p className="font-semibold text-base">{previewQuestion.question_text}</p>

              <div className="space-y-2">
                {previewQuestion.question_options?.map((opt: any, idx: number) => (
                  <div
                    key={opt.id}
                    className={`p-3 rounded-xl border flex items-center justify-between text-sm ${
                      opt.is_correct
                        ? "border-success bg-success/10 font-semibold text-success"
                        : "border-border"
                    }`}
                  >
                    <span>
                      {String.fromCharCode(65 + idx)}. {opt.option_text}
                    </span>
                    {opt.is_correct && <Check className="h-4 w-4 text-success" />}
                  </div>
                ))}
              </div>

              {previewQuestion.explanation && (
                <div className="mt-3 p-3 rounded-xl bg-muted text-xs">
                  <span className="font-bold text-foreground block mb-1">Explanation:</span>
                  {previewQuestion.explanation}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
