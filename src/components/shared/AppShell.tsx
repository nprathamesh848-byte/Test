import { Link, useRouterState } from "@tanstack/react-router";
import { LogOut, Menu, User as UserIcon, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { BrandMark } from "./BrandMark";
import { UserAvatar } from "./UserAvatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth/auth-context";
import { ROLE_LABELS, profilePathFor } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
}

export function AppShell({
  nav,
  children,
  tone = "primary",
}: {
  nav: NavItem[];
  children: ReactNode;
  tone?: "primary" | "warm";
}) {
  const { profile, currentRole, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {nav.map((item) => {
        const active = pathname.startsWith(item.to);
        const content = (
          <>
            <item.icon className="h-4 w-4" />
            <span className="flex-1">{item.label}</span>
            {item.soon && (
              <Badge variant="outline" className="rounded-full text-[10px] font-semibold">
                Soon
              </Badge>
            )}
          </>
        );
        const cls = cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
          active
            ? tone === "warm"
              ? "bg-warm/15 text-warm"
              : "bg-secondary text-secondary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          item.soon && "cursor-not-allowed opacity-70",
        );
        return item.soon ? (
          <div key={item.label} className={cls} aria-disabled>
            {content}
          </div>
        ) : (
          <Link key={item.to} to={item.to} className={cls} onClick={onNavigate}>
            {content}
          </Link>
        );
      })}
    </nav>
  );

  const profilePath = profilePathFor(currentRole);

  return (
    <div className="page-bg min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <div className="mb-6">
                  <BrandMark size="sm" />
                </div>
                <NavLinks onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <BrandMark size="sm" />
          </div>
          <div className="flex items-center gap-2">
            {currentRole && (
              <Badge
                className={cn(
                  "hidden rounded-full sm:inline-flex",
                  tone === "warm" ? "bg-warm text-warm-foreground" : "",
                )}
              >
                {ROLE_LABELS[currentRole]}
              </Badge>
            )}
            {currentRole !== "admin" ? (
              <Link
                to={profilePath}
                className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-muted"
                aria-label="My profile"
              >
                <UserAvatar
                  path={profile?.avatar_url}
                  name={profile?.full_name}
                  className="h-9 w-9"
                />
              </Link>
            ) : (
              <UserAvatar
                path={profile?.avatar_url}
                name={profile?.full_name}
                className="h-9 w-9"
              />
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              disabled={signingOut}
              aria-label="Logout"
            >
              <LogOut />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-8 px-4 py-8">
        <aside className="hidden w-56 shrink-0 md:block">
          <div className="sticky top-24 space-y-4">
            <NavLinks />
            <div className="border-t border-border pt-4">
              {currentRole !== "admin" && (
                <Link
                  to={profilePath}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <UserIcon className="h-4 w-4" /> My Profile
                </Link>
              )}
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" /> {signingOut ? "Signing out..." : "Logout"}
              </button>
            </div>
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
