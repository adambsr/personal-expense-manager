import { useEffect, useState } from "react";
import { CircleUserRound } from "lucide-react";
import { getCurrentUserAvatar } from "@/features/auth/auth-api";
import { useAuth } from "@/features/auth/use-auth";
import { getAccessToken } from "@/features/auth/auth-session";

function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toLocaleUpperCase();
}

export function ProfileAvatar({ className = "" }: { className?: string }) {
  const { user } = useAuth();
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token || !user?.avatarUpdatedAt) return;

    const controller = new AbortController();
    let objectUrl: string | null = null;
    getCurrentUserAvatar(token, controller.signal)
      .then((image) => {
        if (image && !controller.signal.aborted) {
          objectUrl = URL.createObjectURL(image);
          setImageUrl(objectUrl);
        }
      })
      .catch(() => undefined);

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [user?.avatarUpdatedAt]);

  return (
    <span className={`profile-avatar ${className}`} aria-hidden="true">
      {imageUrl ? <img src={imageUrl} alt="" /> : user ? (
        initials(user.firstName, user.lastName) || <CircleUserRound />
      ) : <CircleUserRound />}
    </span>
  );
}
