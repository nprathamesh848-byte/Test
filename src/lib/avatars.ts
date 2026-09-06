import { supabase } from "@/integrations/supabase/client";

export const AVATAR_BUCKET = "avatars";
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function validateAvatarFile(file: File): string | null {
  if (!ALLOWED[file.type]) return "Please upload a JPG, PNG or WebP image.";
  if (file.size > AVATAR_MAX_BYTES) return "That image is too large. Please choose one under 2 MB.";
  return null;
}

/** Uploads to avatars/<user-id>/profile.<ext> (the only path RLS allows for that user). */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const problem = validateAvatarFile(file);
  if (problem) throw new Error(problem);
  const ext = ALLOWED[file.type];
  const path = `${userId}/profile.${ext}`;

  // Remove stale files with a different extension so only one avatar exists per user
  const { data: existing } = await supabase.storage.from(AVATAR_BUCKET).list(userId);
  const stale = (existing ?? []).map((f) => `${userId}/${f.name}`).filter((p) => p !== path);
  if (stale.length) await supabase.storage.from(AVATAR_BUCKET).remove(stale);

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "60" });
  if (error) throw error;
  return path;
}

/** The bucket is private: resolve a short-lived signed URL for display. */
export async function getAvatarUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(path, 60 * 60);
  if (error) {
    console.error("avatar url", error);
    return null;
  }
  return data.signedUrl;
}
