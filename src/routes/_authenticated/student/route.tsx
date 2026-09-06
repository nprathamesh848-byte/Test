import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { LayoutDashboard, BookOpen, TrendingUp, BarChart3, History, User } from "lucide-react";
import { AppShell, type NavItem } from "@/components/shared/AppShell";
import { dashboardPathFor } from "@/lib/auth/roles";

const nav: NavItem[] = [
  { to: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/student/tests", label: "My Tests", icon: BookOpen },
  { to: "/student/performance", label: "Performance", icon: BarChart3 },
  { to: "/student/history", label: "History", icon: History },
  { to: "/student/analytics", label: "Analytics", icon: TrendingUp },
  { to: "/student/profile", label: "My Profile", icon: User },
];

export const Route = createFileRoute("/_authenticated/student")({
  beforeLoad: ({ context }) => {
    if (context.role !== "student") throw redirect({ to: dashboardPathFor(context.role) });
  },
  component: () => (
    <AppShell nav={nav} tone="warm">
      <Outlet />
    </AppShell>
  ),
});
