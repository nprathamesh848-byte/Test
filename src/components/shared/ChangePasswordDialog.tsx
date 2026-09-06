import { useState } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormField } from "./FormField";
import { supabase } from "@/integrations/supabase/client";
import { passwordSchema } from "@/lib/validation";
import { friendlyError } from "@/lib/auth/errors";

export function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{
    password?: string | undefined;
    confirm?: string | undefined;
  }>({});
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setPassword("");
    setConfirm("");
    setErrors({});
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const parsed = passwordSchema.safeParse(password);
    const next: typeof errors = {};
    if (!parsed.success) next.password = parsed.error.issues[0]?.message;
    if (password !== confirm) next.confirm = "Passwords do not match.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated");
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(friendlyError(err, "We couldn't update your password."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <KeyRound /> Change Password
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>
              Use at least 8 characters with letters and numbers.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <FormField id="new-password" label="New password" error={errors.password}>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormField>
            <FormField id="confirm-password" label="Confirm new password" error={errors.confirm}>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </FormField>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Update password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
