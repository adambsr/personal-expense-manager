import { navigateTo } from "@/lib/navigation";

export function signOut(logout: () => void): void {
  logout();
  navigateTo("/login", true);
}
