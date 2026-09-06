import { LogOut, Pencil, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { AvatarUploader } from "./AvatarUploader";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth/auth-context";
import { ROLE_LABELS } from "@/lib/auth/roles";

export interface InfoRow {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
}

export function ProfilePage({
  table,
  rows,
  renderEditForm,
}: {
  table: "students" | "teachers";
  rows: InfoRow[];
  renderEditForm: (close: () => void) => ReactNode;
}) {
  const { profile, currentRole, signOut } = useAuth();
  const [editing, setEditing] = useState(false);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">My Profile</h1>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <AvatarUploader table={table} />
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-bold">{profile?.full_name}</h2>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            {currentRole && (
              <Badge variant="secondary" className="mt-2 rounded-full">
                {ROLE_LABELS[currentRole]}
              </Badge>
            )}
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              {rows.map((r) => (
                <div key={r.label} className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
                  <r.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {r.label}
                    </dt>
                    <dd className="truncate text-sm font-semibold text-foreground">
                      {r.value ?? <span className="text-muted-foreground">—</span>}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setEditing(true)}>
          <Pencil /> Edit Profile
        </Button>
        <ChangePasswordDialog />
        <Button
          variant="ghost"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => void signOut()}
        >
          <LogOut /> Logout
        </Button>
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Update the details of your account.</DialogDescription>
          </DialogHeader>
          {renderEditForm(() => setEditing(false))}
        </DialogContent>
      </Dialog>
    </div>
  );
}
