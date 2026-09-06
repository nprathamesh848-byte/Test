import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { LayoutDashboard, Users, BookOpen, BarChart3, HelpCircle, User } from "lucide-react";
import { AppShell, type NavItem } from "@/components/shared/AppShell";
import { dashboardPathFor } from "@/lib/auth/roles";

const nav: NavItem[] = [
  { to: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/teacher/classes", label: "My Classes", icon: Users },
  { to: "/teacher/question-bank", label: "Question Bank", icon: HelpCircle },
  { to: "/teacher/tests", label: "Test Management", icon: BookOpen },
  { to: "/teacher/profile", label: "My Profile", icon: User },
];

export const Route = createFileRoute("/_authenticated/teacher")({
  beforeLoad: ({ context }) => {
    if (context.role !== "teacher") throw redirect({ to: dashboardPathFor(context.role) });
  },
  component: () => (
    <AppShell nav={nav}>
      <Outlet />
    </AppShell>
  ),
});
