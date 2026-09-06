import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  BookOpen,
  Plus,
  Search,
  UserPlus,
  BarChart3,
  ChevronLeft,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/teacher/class/$classId")({
  head: () => ({ meta: [{ title: "Class Roster & Subjects — AIMS AI" }] }),
  component: ClassDashboardPage,
});

function ClassDashboardPage() {
  const { classId } = Route.useParams();
  const queryClient = useQueryClient();

  const [studentSearch, setStudentSearch] = useState("");
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Topic creation dialog
  const [isAddTopicOpen, setIsAddTopicOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [topicName, setTopicName] = useState("");

  // Fetch Class details
  const { data: classData, isLoading: isClassLoading } = useQuery({
    queryKey: ["class-detail", classId],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("*").eq("id", classId).single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch Students in class
  const { data: studentsInClass = [], isLoading: isStudentsLoading } = useQuery({
    queryKey: ["class-students", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("class_students")
        .select(
          "id, student_id, joined_at, profiles:student_id(full_name, email), students:student_id(class_level, preferred_language)",
        )
        .eq("class_id", classId);
      if (error) throw error;
      return data || [];
    },
  });

  // Search available students to add
  const { data: availableStudents = [] } = useQuery({
    queryKey: ["search-students", studentSearch],
    enabled: studentSearch.trim().length > 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("user_id, full_name, class_level, profiles:user_id(email)")
        .ilike("full_name", `%${studentSearch.trim()}%`)
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch subjects for class level
  const { data: subjects = [] } = useQuery({
    queryKey: ["class-subjects", classData?.class_level],
    enabled: !!classData?.class_level,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*, topics(*)")
        .eq("class_level", classData!.class_level);
      if (error) throw error;
      return data || [];
    },
  });

  // Add student mutation
  const addStudentMutation = useMutation({
    mutationFn: async (studentUserId: string) => {
      const { error } = await supabase.from("class_students").insert({
        class_id: classId,
        student_id: studentUserId,
        status: "ACTIVE",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Student added to class!");
      setIsAddStudentOpen(false);
      setStudentSearch("");
      setSelectedStudentId(null);
      void queryClient.invalidateQueries({ queryKey: ["class-students", classId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add student to class");
    },
  });

  // Remove student mutation
  const removeStudentMutation = useMutation({
    mutationFn: async (rowId: string) => {
      const { error } = await supabase.from("class_students").delete().eq("id", rowId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Student removed from class");
      void queryClient.invalidateQueries({ queryKey: ["class-students", classId] });
    },
  });

  // Add Topic mutation
  const addTopicMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSubjectId || !topicName.trim())
        throw new Error("Topic name and Subject required");
      const { error } = await supabase.from("topics").insert({
        subject_id: selectedSubjectId,
        name: topicName.trim(),
        status: "ACTIVE",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Topic added successfully!");
      setIsAddTopicOpen(false);
      setTopicName("");
      void queryClient.invalidateQueries({ queryKey: ["class-subjects", classData?.class_level] });
    },
  });

  if (isClassLoading) {
    return <Skeleton className="h-64 rounded-3xl" />;
  }

  if (!classData) {
    return <div className="p-8 text-center">Class not found.</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 gap-1">
          <Link to="/teacher/classes">
            <ChevronLeft className="h-4 w-4" /> Back to My Classes
          </Link>
        </Button>

        <div className="brand-gradient text-primary-foreground rounded-3xl p-6 shadow-lift sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-primary-foreground/20 text-primary-foreground">
                Class {classData.class_level}
              </Badge>
              <Badge className="bg-primary-foreground/20 text-primary-foreground">
                {classData.academic_year}
              </Badge>
            </div>
            <h1 className="text-3xl font-bold mt-2">{classData.name}</h1>
            <p className="text-sm opacity-90 mt-1">{studentsInClass.length} Enrolled Students</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/20 gap-2">
              <Link to="/teacher/class/$classId/students" params={{ classId }}>
                <Users className="h-4 w-4" /> Student Performance
              </Link>
            </Button>
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
              <Link to="/teacher/class/$classId/analytics" params={{ classId }}>
                <BarChart3 className="h-4 w-4" /> Class Analytics
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="students" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="students" className="gap-2">
            <Users className="h-4 w-4" /> Student Roster ({studentsInClass.length})
          </TabsTrigger>
          <TabsTrigger value="subjects" className="gap-2">
            <BookOpen className="h-4 w-4" /> Subjects & Topics ({subjects.length})
          </TabsTrigger>
        </TabsList>

        {/* Student Roster Tab */}
        <TabsContent value="students" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Class Roster</h2>
            <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="h-4 w-4" /> Add Student
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold">
                    Add Student to {classData.name}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Search student by full name..."
                      className="pl-9"
                    />
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {availableStudents.map((st: any) => (
                      <div
                        key={st.user_id}
                        onClick={() => setSelectedStudentId(st.user_id)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                          selectedStudentId === st.user_id
                            ? "border-primary bg-primary/10 font-semibold"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <div>
                          <p className="text-sm font-medium">{st.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {st.profiles?.email} • Class {st.class_level}
                          </p>
                        </div>
                        {selectedStudentId === st.user_id && (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddStudentOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    disabled={!selectedStudentId || addStudentMutation.isPending}
                    onClick={() =>
                      selectedStudentId && addStudentMutation.mutate(selectedStudentId)
                    }
                  >
                    {addStudentMutation.isPending ? "Adding..." : "Add to Class"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {isStudentsLoading ? (
            <Skeleton className="h-48 rounded-2xl" />
          ) : studentsInClass.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
              <h3 className="text-lg font-bold">No students in this class</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Click "Add Student" above to add registered students to this roster.
              </p>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {studentsInClass.map((row: any, idx: number) => (
                <Card key={row.id} className="p-4 flex items-center justify-between shadow-soft">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary font-bold text-xs">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-sm">
                        {row.profiles?.full_name || "Student"}
                      </p>
                      <p className="text-xs text-muted-foreground">{row.profiles?.email}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Remove student"
                    onClick={() => removeStudentMutation.mutate(row.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Subjects & Topics Tab */}
        <TabsContent value="subjects" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Subjects & Topics (Class {classData.class_level})</h2>
            <Dialog open={isAddTopicOpen} onOpenChange={setIsAddTopicOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" variant="outline">
                  <Plus className="h-4 w-4" /> Add Topic
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold">Add Topic to Subject</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <label className="text-sm font-semibold">Select Subject</label>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      className="w-full mt-1 p-2 rounded-xl border border-border bg-background text-sm"
                    >
                      <option value="">-- Choose Subject --</option>
                      {subjects.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Topic Name</label>
                    <Input
                      value={topicName}
                      onChange={(e) => setTopicName(e.target.value)}
                      placeholder="e.g. Fractions Addition"
                      className="mt-1"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddTopicOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => addTopicMutation.mutate()}
                    disabled={addTopicMutation.isPending}
                  >
                    Save Topic
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {subjects.map((subj: any) => (
              <Card key={subj.id}>
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center justify-between">
                    <span>{subj.name}</span>
                    <Badge variant="outline">{subj.topics?.length || 0} Topics</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {subj.topics?.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No topics created yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {subj.topics.map((t: any) => (
                        <Badge key={t.id} variant="secondary" className="px-3 py-1 text-xs">
                          {t.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
