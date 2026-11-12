import { CircleHelp, LayoutDashboard, ReceiptText } from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import { handleClientNavigation } from "@/lib/navigation";

export type SidebarPage = "Dashboard" | "Transactions" | "About" | null;

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
  return (
    <div className="dashboard-sidebar-content">
      <nav className="sidebar-nav" aria-label="Main navigation">
        {navigationItems.map(({ label, href, icon: Icon }) => (
          <a
            key={label}
            href={href}
            onClick={(event) => {
              handleClientNavigation(event, href);
              if (event.defaultPrevented) onNavigate?.();
            }}
            className={`nav-item ${activePage === label ? "nav-item-active" : ""}`}
            aria-current={activePage === label ? "page" : undefined}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
          </a>
        ))}
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
