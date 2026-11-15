import { CircleHelp, Grid2X2, LayoutDashboard, ReceiptText, ShieldCheck, UserRoundCog } from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import { useAuth } from "@/features/auth/use-auth";
import { handleClientNavigation } from "@/lib/navigation";

export type SidebarPage = "Dashboard" | "Transactions" | "About" | "Admin Overview" | "Manage Users" | "Global Categories" | null;

const navigationItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Transactions", href: "/transactions", icon: ReceiptText },
  { label: "About", href: "/about", icon: CircleHelp },
] as const;

export function DashboardSidebarContent({
  activePage,
  onNavigate,
}: {
  activePage: SidebarPage;
  onNavigate?: () => void;
}) {
  const { user } = useAuth();

  function renderLink(label: string, href: string, Icon: typeof LayoutDashboard) {
    const isActive = activePage === label;
    return (
      <a
        key={href}
        href={href}
        onClick={(event) => {
          handleClientNavigation(event, href);
          if (event.defaultPrevented) onNavigate?.();
        }}
        className={`nav-item ${isActive ? "nav-item-active" : ""}`}
        aria-current={isActive ? "page" : undefined}
      >
        <Icon size={18} aria-hidden="true" />
        <span>{label}</span>
      </a>
    );
  }

  return (
    <div className="dashboard-sidebar-content">
      <nav className="sidebar-nav" aria-label="Main navigation">
        <span className="sidebar-section-label">Workspace</span>
        {navigationItems.map(({ label, href, icon: Icon }) => renderLink(label, href, Icon))}
        {user?.role === "ADMIN" ? (
          <>
            <span className="sidebar-section-label sidebar-section-admin">Administration</span>
            {renderLink("Admin Overview", "/admin", ShieldCheck)}
            {renderLink("Manage Users", "/admin/users", UserRoundCog)}
            {renderLink("Global Categories", "/admin/categories", Grid2X2)}
          </>
        ) : null}
      </nav>

      <footer className="sidebar-footer">
        <AccountMenu placement="sidebar" />
      </footer>
    </div>
  );
}

export function DashboardSidebar({ activePage = "Dashboard" }: { activePage?: SidebarPage }) {
  return (
    <aside className="dashboard-sidebar">
      <DashboardSidebarContent activePage={activePage} />
    </aside>
  );
}
