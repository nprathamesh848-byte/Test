import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, BookOpen, ChevronRight, School, GraduationCap } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/_authenticated/teacher/classes")({
  head: () => ({ meta: [{ title: "My Classes — AIMS AI" }] }),
  component: TeacherClassesPage,
});

function TeacherClassesPage() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const [className, setClassName] = useState("");
  const [classLevel, setClassLevel] = useState<number>(7);
  const [section, setSection] = useState("A");
  const [academicYear, setAcademicYear] = useState("2026-27");

  // Fetch teacher's assigned / created classes
  const { data: classes = [], isLoading } = useQuery({
    queryKey: ["teacher-classes", currentUser?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*, class_students(count)")
        .eq("created_by", currentUser!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const createClassMutation = useMutation({
    mutationFn: async () => {
      const name = className.trim() || `Class ${classLevel}${section ? " " + section : ""}`;
      const { data: newClass, error } = await supabase
        .from("classes")
        .insert({
          name,
          class_level: classLevel,
          section: section.trim() || null,
          academic_year: academicYear,
          created_by: currentUser!.id,
          status: "ACTIVE",
        })
        .select()
        .single();

      if (error) throw error;

      // Link in teacher_classes
      await supabase.from("teacher_classes").insert({
        teacher_id: currentUser!.id,
        class_id: newClass.id,
      });

      return newClass;
    },
    onSuccess: () => {
      toast.success("Class created successfully!");
      setIsOpen(false);
      setClassName("");
      void queryClient.invalidateQueries({ queryKey: ["teacher-classes"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create class");
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Classes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage student rosters, subjects, and assigned assessments for your classes.
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="brand-gradient text-primary-foreground gap-2">
              <Plus className="h-4 w-4" /> Create Class
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Create New Class</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Class Name (e.g. Class 7A)</Label>
                <Input
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="Class 7A"
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Class Level</Label>
                  <Select
                    value={classLevel.toString()}
                    onValueChange={(v) => setClassLevel(parseInt(v))}
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
                  <Label>Section</Label>
                  <Input
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    placeholder="A"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label>Academic Year</Label>
                <Input
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="2026-27"
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createClassMutation.mutate()}
                disabled={createClassMutation.isPending}
              >
                {createClassMutation.isPending ? "Creating..." : "Create Class"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : classes.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <GraduationCap className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-bold">No classes created yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first class to start managing student rosters and assessments.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <Card
              key={cls.id}
              className="hover:border-primary/50 transition-all hover:shadow-soft flex flex-col justify-between"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">Class {cls.class_level}</Badge>
                  <Badge className="bg-success/20 text-success font-semibold">
                    {cls.academic_year}
                  </Badge>
                </div>
                <CardTitle className="text-2xl font-bold mt-2">{cls.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Users className="h-4 w-4 text-primary" /> {cls.class_students?.[0]?.count ?? 0}{" "}
                    Students
                  </span>
                  <span className="flex items-center gap-1.5">
                    <School className="h-4 w-4" /> Active Roster
                  </span>
                </div>
                <Button asChild className="w-full gap-2" variant="outline">
                  <Link to="/teacher/class/$classId" params={{ classId: cls.id }}>
                    Open Dashboard <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
