import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Cake, GraduationCap, Languages, Phone, School } from "lucide-react";
import { toast } from "sonner";
import { ProfilePage, type InfoRow } from "@/components/shared/ProfilePage";
import { FormField } from "@/components/shared/FormField";
import { InlineLoading } from "@/components/shared/LoadingScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { friendlyError } from "@/lib/auth/errors";
import {
  CLASS_LEVELS,
  LANGUAGES,
  ageFromDob,
  studentProfileSchema,
  validate,
} from "@/lib/validation";

export const Route = createFileRoute("/_authenticated/student/profile")({
  head: () => ({ meta: [{ title: "My Profile — AIMS AI" }] }),
  component: StudentProfile,
});

interface StudentRow {
  class_level: number;
  school_name: string | null;
  date_of_birth: string | null;
  age: number | null;
  preferred_language: string;
}

function StudentProfile() {
  const { currentUser, profile } = useAuth();
  const { data: student, isLoading } = useQuery({
    queryKey: ["student-full", currentUser?.id],
    enabled: !!currentUser,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("class_level, school_name, date_of_birth, age, preferred_language")
        .eq("user_id", currentUser!.id)
        .maybeSingle();
      if (error) throw error;
      return data as StudentRow | null;
    },
  });

  if (isLoading || !student) return <InlineLoading message="Loading your profile..." />;

  const age = student.age ?? ageFromDob(student.date_of_birth);
  const rows: InfoRow[] = [
    { icon: GraduationCap, label: "Class", value: `Class ${student.class_level}` },
    { icon: School, label: "School", value: student.school_name },
    {
      icon: Cake,
      label: "Age / Date of birth",
      value: student.date_of_birth
        ? `${age ?? "—"} yrs · ${new Date(student.date_of_birth).toLocaleDateString("en-IN")}`
        : null,
    },
    { icon: Languages, label: "Preferred language", value: student.preferred_language },
    { icon: Phone, label: "Phone", value: profile?.phone },
  ];

  return (
    <ProfilePage
      table="students"
      rows={rows}
      renderEditForm={(close) => <EditForm student={student} close={close} />}
    />
  );
}

function EditForm({ student, close }: { student: StudentRow; close: () => void }) {
  const { currentUser, profile, refresh } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    fullName: profile?.full_name ?? "",
    phone: profile?.phone ?? "",
    classLevel: String(student.class_level),
    schoolName: student.school_name ?? "",
    dateOfBirth: student.date_of_birth ?? "",
    preferredLanguage: student.preferred_language,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || !currentUser) return;
    const { data, errors } = validate(studentProfileSchema, form);
    if (errors) {
      setErrors(errors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const dob = form.dateOfBirth || null;
      const [p, s] = await Promise.all([
        supabase
          .from("profiles")
          .update({ full_name: data.fullName, phone: form.phone.trim() || null })
          .eq("id", currentUser.id),
        supabase
          .from("students")
          .update({
            full_name: data.fullName,
            class_level: data.classLevel,
            school_name: form.schoolName.trim() || null,
            date_of_birth: dob,
            age: ageFromDob(dob),
            preferred_language: form.preferredLanguage,
          })
          .eq("user_id", currentUser.id),
      ]);
      if (p.error) throw p.error;
      if (s.error) throw s.error;
      await Promise.all([
        refresh(),
        queryClient.invalidateQueries({ queryKey: ["student-full"] }),
        queryClient.invalidateQueries({ queryKey: ["student"] }),
      ]);
      toast.success("Profile saved");
      close();
    } catch (err) {
      toast.error(friendlyError(err, "We couldn't save your profile."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <FormField id="fullName" label="Full name" error={errors["fullName"]}>
        <Input
          id="fullName"
          value={form.fullName}
          onChange={(e) => set("fullName")(e.target.value)}
        />
      </FormField>
      <FormField id="classLevel" label="Class" error={errors["classLevel"]}>
        <Select value={form.classLevel} onValueChange={set("classLevel")}>
          <SelectTrigger id="classLevel">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CLASS_LEVELS.map((c) => (
              <SelectItem key={c} value={String(c)}>
                Class {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <FormField id="schoolName" label="School name" error={errors["schoolName"]}>
        <Input
          id="schoolName"
          value={form.schoolName}
          onChange={(e) => set("schoolName")(e.target.value)}
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="dateOfBirth" label="Date of birth" error={errors["dateOfBirth"]}>
          <Input
            id="dateOfBirth"
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => set("dateOfBirth")(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
          />
        </FormField>
        <FormField
          id="preferredLanguage"
          label="Preferred language"
          error={errors["preferredLanguage"]}
        >
          <Select value={form.preferredLanguage} onValueChange={set("preferredLanguage")}>
            <SelectTrigger id="preferredLanguage">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>
      <FormField id="phone" label="Phone" error={errors["phone"]} hint="Optional">
        <Input
          id="phone"
          type="tel"
          value={form.phone}
          onChange={(e) => set("phone")(e.target.value)}
        />
      </FormField>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={close} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
