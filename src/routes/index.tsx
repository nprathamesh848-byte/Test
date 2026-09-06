import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { useAuth } from "@/lib/auth/auth-context";
import { dashboardPathFor } from "@/lib/auth/roles";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AIMS AI — Assess. Identify. Improve. Master." },
      {
        name: "description",
        content:
          "AIMS AI: a secure learning and assessment platform for students, teachers and schools, Class 1 to 10.",
      },
      { property: "og:title", content: "AIMS AI" },
      {
        property: "og:description",
        content: "Assess. Identify. Improve. Master. Learning platform for Class 1–10.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

/** Session-aware entry: sends signed-in users to their role's dashboard, others to login. */
function Index() {
  const { isLoading, isAuthenticated, currentRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      void navigate({ to: "/login", replace: true });
      return;
    }
    if (currentRole) void navigate({ to: dashboardPathFor(currentRole), replace: true });
  }, [isLoading, isAuthenticated, currentRole, navigate]);

  return <LoadingScreen message="Opening AIMS AI..." />;
}
