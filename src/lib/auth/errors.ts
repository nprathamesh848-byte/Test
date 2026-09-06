/**
 * Maps raw auth/database errors to friendly, student-safe messages.
 * Raw messages are logged to the console, never shown.
 */
export function friendlyError(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (!error) return fallback;
  const raw = typeof error === "string" ? error : ((error as { message?: string })?.message ?? "");
  const msg = raw.toLowerCase();
  console.error("[AIMS AI]", raw);

  if (msg.includes("invalid login credentials"))
    return "Incorrect email or password. Please try again.";
  if (msg.includes("email not confirmed"))
    return "Please confirm your email address before signing in. Check your inbox.";
  if (
    msg.includes("user already registered") ||
    msg.includes("already been registered") ||
    msg.includes("already exists")
  )
    return "An account with this email already exists. Try signing in instead.";
  if (
    msg.includes("password should be") ||
    msg.includes("weak password") ||
    msg.includes("password is too weak")
  )
    return "That password is too weak. Use at least 8 characters with letters and numbers.";
  if (
    msg.includes("invalid email") ||
    msg.includes("unable to validate email") ||
    (msg.includes("email address") && msg.includes("invalid"))
  )
    return "That email address doesn't look right.";
  if (msg.includes("rate limit") || msg.includes("too many requests"))
    return "Too many attempts. Please wait a minute and try again.";
  if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("load failed"))
    return "Can't reach the server. Check your internet connection and try again.";
  if (msg.includes("jwt") || msg.includes("session") || msg.includes("refresh token"))
    return "Your session has expired. Please sign in again.";
  if (
    msg.includes("row-level security") ||
    msg.includes("permission denied") ||
    msg.includes("not authorized")
  )
    return "You don't have permission to do that.";
  if (msg.includes("class level")) return "Please choose a class between 1 and 10.";
  if (
    msg.includes("payload too large") ||
    msg.includes("exceeded the maximum allowed size") ||
    msg.includes("object exceeded")
  )
    return "That image is too large. Please choose one under 2 MB.";
  if (msg.includes("mime type") || msg.includes("not supported"))
    return "Please upload a JPG, PNG or WebP image.";
  if (msg.includes("same password") || msg.includes("different from the old"))
    return "Your new password must be different from your current password.";
  return fallback;
}
