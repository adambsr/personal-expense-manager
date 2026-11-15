import { useState } from "react";
import { Menu, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/account-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DashboardSidebarContent, type SidebarPage } from "@/features/dashboard/dashboard-sidebar";
import { useTheme } from "@/features/theme/use-theme";
import { handleClientNavigation } from "@/lib/navigation";

export function AppHeader({ activePage }: { activePage: SidebarPage }) {
  const { colorMode, toggleColorMode } = useTheme();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  return (
    <Sheet open={mobileNavigationOpen} onOpenChange={setMobileNavigationOpen}>
      <header className="app-header">
        <a className="app-header-brand" href="/" aria-label="Personal Expense Manager dashboard" onClick={(event) => handleClientNavigation(event, "/")}>
          <img className="app-header-logo" src="/em-logo.png" alt="Personal Expense Manager" />
        </a>

        <div className="app-header-actions">
          <SheetTrigger
            render={
              <Button className="mobile-navigation-toggle" variant="ghost" size="icon" aria-label="Open navigation menu" />
            }
          >
            <Menu aria-hidden="true" />
          </SheetTrigger>
          <Button
            className="color-mode-toggle"
            variant="ghost"
            size="icon"
            aria-label={`Switch to ${colorMode === "light" ? "dark" : "light"} mode`}
            title={`Switch to ${colorMode === "light" ? "dark" : "light"} mode`}
            aria-pressed={colorMode === "dark"}
            onClick={toggleColorMode}
          >
            {colorMode === "light" ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
          </Button>
          <AccountMenu />
        </div>
      </header>
      <SheetContent side="left" className="mobile-navigation-sheet">
        <SheetHeader>
          <SheetTitle>Navigation</SheetTitle>
          <SheetDescription>Choose an area of your finance workspace.</SheetDescription>
        </SheetHeader>
        <DashboardSidebarContent activePage={activePage} onNavigate={() => setMobileNavigationOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

