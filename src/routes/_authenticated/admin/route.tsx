import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { LayoutDashboard, Users, School, Presentation, GraduationCap } from "lucide-react";
import { AppShell, type NavItem } from "@/components/shared/AppShell";
import { dashboardPathFor } from "@/lib/auth/roles";

const nav: NavItem[] = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/academic", label: "Academic Admin", icon: School },
];

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: ({ context }) => {
    if (context.role !== "admin") throw redirect({ to: dashboardPathFor(context.role) });
  },
  component: () => (
    <AppShell nav={nav}>
      <Outlet />
    </AppShell>
  ),
});
