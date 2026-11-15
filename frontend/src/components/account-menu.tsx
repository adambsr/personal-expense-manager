import { useState } from "react";
import { ChevronDown, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { ProfileAvatar } from "@/components/profile-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth/use-auth";
import { signOut } from "@/features/auth/sign-out";
import { navigateTo } from "@/lib/navigation";

function nameFromEmail(email: string): string {
  const localPart = email.split("@")[0] ?? "";
  const nameParts = localPart.split(/[._+-]+/).filter(Boolean);
  if (nameParts.length === 0) return email;

  return nameParts
    .map((part) => `${part.charAt(0).toLocaleUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function AccountMenu({ placement = "header" }: { placement?: "header" | "sidebar" }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user) return null;

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || nameFromEmail(user.email);
  const sidebar = placement === "sidebar";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={`profile-trigger${sidebar ? " sidebar-account-trigger" : ""}`}
        aria-label={`Open profile menu for ${displayName}`}
      >
        <ProfileAvatar className={sidebar ? "profile-avatar-menu" : ""} />
        <span className="profile-identity">
          <strong>{displayName}</strong>
          <span>{user.email}</span>
        </span>
        <ChevronDown className="profile-chevron" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="profile-menu" align={sidebar ? "start" : "end"} side={sidebar ? "top" : "bottom"} sideOffset={8}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="profile-menu-label">
            <ProfileAvatar className="profile-avatar-menu" />
            <span><strong>{displayName}</strong><small>{user.email}</small></span>
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => {
            setOpen(false);
            navigateTo("/profile");
          }}>
            <UserRound aria-hidden="true" /> My Profile
          </DropdownMenuItem>
          {user.role === "ADMIN" ? <DropdownMenuItem onClick={() => {
            setOpen(false);
            navigateTo("/admin");
          }}><ShieldCheck aria-hidden="true" /> Administration</DropdownMenuItem> : null}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="profile-sign-out" onClick={() => signOut(logout)}>
          <LogOut aria-hidden="true" /> Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
