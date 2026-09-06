import { supabase } from "@/integrations/supabase/client";

export type AppRole = "student" | "teacher" | "admin";

export const ROLE_LABELS: Record<AppRole, string> = {
  student: "Student",
  teacher: "Teacher",
  admin: "Admin",
};

export function dashboardPathFor(role: AppRole | null | undefined): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "teacher":
      return "/teacher/dashboard";
    case "student":
      return "/student/dashboard";
    default:
      return "/login";
  }
}

export function profilePathFor(role: AppRole | null | undefined): string {
  switch (role) {
    case "teacher":
      return "/teacher/profile";
    case "student":
      return "/student/profile";
    case "admin":
      return "/admin/dashboard";
    default:
      return "/login";
  }
}

/** Role is resolved server-side by a security-definer function; the client never decides it. */
export async function fetchMyRole(): Promise<AppRole | null> {
  const { data, error } = await supabase.rpc("get_my_role");
  if (error) {
    console.error("Failed to resolve role", error);
    return null;
  }
  return (data as AppRole | null) ?? null;
}
