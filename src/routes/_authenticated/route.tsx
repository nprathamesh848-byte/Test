import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyRole } from "@/lib/auth/roles";
import { LoadingScreen } from "@/components/shared/LoadingScreen";

/**
 * Protected subtree. Client-only because the session lives in browser storage.
 * Resolves the user's role from the database (never from the client) and exposes
 * it as route context so role layouts can gate their own areas.
 */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    const role = await fetchMyRole();
    if (!role) throw redirect({ to: "/login" });
    return { user: data.user, role };
  },
  pendingComponent: () => <LoadingScreen message="Checking your session..." />,
  component: () => <Outlet />,
});
