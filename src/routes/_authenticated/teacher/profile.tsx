import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BookMarked, Phone, School } from "lucide-react";
import { toast } from "sonner";
import { ProfilePage, type InfoRow } from "@/components/shared/ProfilePage";
import { FormField } from "@/components/shared/FormField";
import { InlineLoading } from "@/components/shared/LoadingScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { friendlyError } from "@/lib/auth/errors";
import { teacherProfileSchema, validate } from "@/lib/validation";

export const Route = createFileRoute("/_authenticated/teacher/profile")({
  head: () => ({ meta: [{ title: "My Profile — AIMS AI" }] }),
  component: TeacherProfile,
});

interface TeacherRow {
  school_name: string | null;
  specialization: string | null;
}

function TeacherProfile() {
  const { currentUser, profile } = useAuth();
  const { data: teacher, isLoading } = useQuery({
    queryKey: ["teacher-full", currentUser?.id],
    enabled: !!currentUser,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("school_name, specialization")
        .eq("user_id", currentUser!.id)
        .maybeSingle();
      if (error) throw error;
      return data as TeacherRow | null;
    },
  });

  if (isLoading || !teacher) return <InlineLoading message="Loading your profile..." />;

  const rows: InfoRow[] = [
    { icon: School, label: "School", value: teacher.school_name },
    { icon: BookMarked, label: "Specialization", value: teacher.specialization },
    { icon: Phone, label: "Phone", value: profile?.phone },
  ];

  return (
    <ProfilePage
      table="teachers"
      rows={rows}
      renderEditForm={(close) => <EditForm teacher={teacher} close={close} />}
    />
  );
}

function EditForm({ teacher, close }: { teacher: TeacherRow; close: () => void }) {
  const { currentUser, profile, refresh } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    fullName: profile?.full_name ?? "",
    phone: profile?.phone ?? "",
    schoolName: teacher.school_name ?? "",
    specialization: teacher.specialization ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || !currentUser) return;
    const { data, errors } = validate(teacherProfileSchema, form);
    if (errors) {
      setErrors(errors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const [p, t] = await Promise.all([
        supabase
          .from("profiles")
          .update({ full_name: data.fullName, phone: form.phone.trim() || null })
          .eq("id", currentUser.id),
        supabase
          .from("teachers")
          .update({
            full_name: data.fullName,
            school_name: form.schoolName.trim() || null,
            specialization: form.specialization.trim() || null,
          })
          .eq("user_id", currentUser.id),
      ]);
      if (p.error) throw p.error;
      if (t.error) throw t.error;
      await Promise.all([refresh(), queryClient.invalidateQueries({ queryKey: ["teacher-full"] })]);
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
      <FormField id="schoolName" label="School name" error={errors["schoolName"]}>
        <Input
          id="schoolName"
          value={form.schoolName}
          onChange={(e) => set("schoolName")(e.target.value)}
        />
      </FormField>
      <FormField
        id="specialization"
        label="Subject / specialization"
        error={errors["specialization"]}
      >
        <Input
          id="specialization"
          value={form.specialization}
          onChange={(e) => set("specialization")(e.target.value)}
        />
      </FormField>
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
