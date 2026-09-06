import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatars";
import { cn } from "@/lib/utils";

export function useAvatarUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["avatar-url", path],
    queryFn: () => getAvatarUrl(path),
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
  });
}

export function initialsOf(name?: string | null) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function UserAvatar({
  path,
  name,
  className,
}: {
  path?: string | null | undefined;
  name?: string | null | undefined;
  className?: string | undefined;
}) {
  const { data: url } = useAvatarUrl(path);
  return (
    <Avatar className={cn("border border-border bg-secondary", className)}>
      {url && (
        <AvatarImage
          src={url}
          alt={name ? `${name}'s profile photo` : "Profile photo"}
          className="object-cover"
        />
      )}
      <AvatarFallback className="bg-secondary font-display font-bold text-secondary-foreground">
        {initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  );
}
