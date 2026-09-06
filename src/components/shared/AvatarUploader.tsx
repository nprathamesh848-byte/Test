import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { UserAvatar } from "./UserAvatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { uploadAvatar, validateAvatarFile } from "@/lib/avatars";
import { friendlyError } from "@/lib/auth/errors";
import { useAuth } from "@/lib/auth/auth-context";

export function AvatarUploader({ table }: { table: "students" | "teachers" | null }) {
  const { currentUser, profile, refresh } = useAuth();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const onFile = async (file: File | undefined) => {
    if (!file || !currentUser || uploading) return;
    const problem = validateAvatarFile(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    setUploading(true);
    try {
      const path = await uploadAvatar(currentUser.id, file);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", currentUser.id);
      if (error) throw error;
      if (table) {
        await supabase.from(table).update({ avatar_url: path }).eq("user_id", currentUser.id);
      }
      await queryClient.invalidateQueries({ queryKey: ["avatar-url"] });
      await refresh();
      toast.success("Profile photo updated");
    } catch (e) {
      toast.error(friendlyError(e, "We couldn't upload that photo. Please try again."));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <UserAvatar
          path={profile?.avatar_url}
          name={profile?.full_name}
          className="h-28 w-28 text-3xl"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label="Change profile photo"
          className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? "Uploading..." : "Change photo"}
      </Button>
      <p className="text-xs text-muted-foreground">JPG, PNG or WebP · up to 2 MB</p>
    </div>
  );
}
