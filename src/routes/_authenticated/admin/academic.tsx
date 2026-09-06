import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { School, Plus, BookOpen, Layers, CheckCircle2, ShieldCheck } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/academic")({
  head: () => ({ meta: [{ title: "Admin Academic Content — AIMS AI" }] }),
  component: AdminAcademicPage,
});

function AdminAcademicPage() {
  const queryClient = useQueryClient();

  // Create School state
  const [isAddSchoolOpen, setIsAddSchoolOpen] = useState(false);
  const [schoolName, setSchoolName] = useState("");
  const [schoolCity, setSchoolCity] = useState("");
  const [schoolState, setSchoolState] = useState("");

  // Create Subject state
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [subjectClassLevel, setSubjectClassLevel] = useState<number>(7);

  // Fetch Schools
  const { data: schools = [] } = useQuery({
    queryKey: ["admin-schools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch Subjects
  const { data: subjects = [] } = useQuery({
    queryKey: ["admin-subjects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*, topics(count)")
        .order("class_level");
      if (error) throw error;
      return data || [];
    },
  });

  // Add School Mutation
  const addSchoolMutation = useMutation({
    mutationFn: async () => {
      if (!schoolName.trim()) throw new Error("School name required");
      const { error } = await supabase.from("schools").insert({
        name: schoolName.trim(),
        city: schoolCity.trim() || null,
        state: schoolState.trim() || null,
        status: "ACTIVE",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("School created!");
      setIsAddSchoolOpen(false);
      setSchoolName("");
      void queryClient.invalidateQueries({ queryKey: ["admin-schools"] });
    },
  });

  // Add Subject Mutation
  const addSubjectMutation = useMutation({
    mutationFn: async () => {
      if (!subjectName.trim()) throw new Error("Subject name required");
      const { error } = await supabase.from("subjects").insert({
        name: subjectName.trim(),
        class_level: subjectClassLevel,
        status: "ACTIVE",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subject added!");
      setIsAddSubjectOpen(false);
      setSubjectName("");
      void queryClient.invalidateQueries({ queryKey: ["admin-subjects"] });
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Academic Administration</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Platform-wide management of Schools, Subjects, and Academic Curriculum Structure.
        </p>
      </div>

      <Tabs defaultValue="schools" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="schools" className="gap-2">
            <School className="h-4 w-4" /> Schools ({schools.length})
          </TabsTrigger>
          <TabsTrigger value="subjects" className="gap-2">
            <BookOpen className="h-4 w-4" /> Subjects ({subjects.length})
          </TabsTrigger>
        </TabsList>

        {/* Schools Tab */}
        <TabsContent value="schools" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Platform Registered Schools</h2>
            <Dialog open={isAddSchoolOpen} onOpenChange={setIsAddSchoolOpen}>
              <DialogTrigger asChild>
                <Button className="brand-gradient text-primary-foreground gap-2">
                  <Plus className="h-4 w-4" /> Register School
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold">Register New School</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <Label>School Name</Label>
                    <Input
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      placeholder="e.g. St. Xavier's School"
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>City</Label>
                      <Input
                        value={schoolCity}
                        onChange={(e) => setSchoolCity(e.target.value)}
                        placeholder="Mumbai"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>State</Label>
                      <Input
                        value={schoolState}
                        onChange={(e) => setSchoolState(e.target.value)}
                        placeholder="Maharashtra"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddSchoolOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => addSchoolMutation.mutate()}
                    disabled={addSchoolMutation.isPending}
                  >
                    Save School
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {schools.map((sch) => (
              <Card key={sch.id} className="p-5 shadow-soft">
                <div className="flex items-center justify-between">
                  <Badge className="bg-success text-success-foreground font-semibold">
                    {sch.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{sch.country}</span>
                </div>
                <h3 className="text-lg font-bold mt-2">{sch.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {sch.city ? `${sch.city}, ${sch.state}` : "Location unspecified"}
                </p>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Subjects Tab */}
        <TabsContent value="subjects" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Curriculum Subjects (Class 1 – 10)</h2>
            <Dialog open={isAddSubjectOpen} onOpenChange={setIsAddSubjectOpen}>
              <DialogTrigger asChild>
                <Button className="brand-gradient text-primary-foreground gap-2">
                  <Plus className="h-4 w-4" /> Add Subject
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold">Add Subject to Curriculum</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <Label>Subject Name</Label>
                    <Input
                      value={subjectName}
                      onChange={(e) => setSubjectName(e.target.value)}
                      placeholder="e.g. Science"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Target Class Level</Label>
                    <Select
                      value={subjectClassLevel.toString()}
                      onValueChange={(v) => setSubjectClassLevel(parseInt(v))}
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
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddSubjectOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => addSubjectMutation.mutate()}
                    disabled={addSubjectMutation.isPending}
                  >
                    Save Subject
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((sub: any) => (
              <Card key={sub.id} className="p-5 shadow-soft">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">Class {sub.class_level}</Badge>
                  <Badge variant="secondary">{sub.topics?.[0]?.count ?? 0} Topics</Badge>
                </div>
                <h3 className="text-lg font-bold mt-2">{sub.name}</h3>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
