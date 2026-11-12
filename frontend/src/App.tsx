import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import DashboardPage from "@/features/dashboard/dashboard-page";
import TransactionsPage from "@/features/transactions/transactions-page";
import AboutPage from "@/features/about/about-page";
import ProfilePage from "@/features/profile/profile-page";
import { AuthPage, SessionRestoreError } from "@/features/auth/auth-page";
import { AuthProvider } from "@/features/auth/auth-provider";
import { useAuth } from "@/features/auth/use-auth";
import { signOut } from "@/features/auth/sign-out";
import { navigateTo } from "@/lib/navigation";
import { Toaster } from "sonner";
import "./App.css";

const SPLASH_SESSION_KEY = "pem.splash-seen";
const SPLASH_DURATION_MS = 1_800;
const SPLASH_EXIT_DURATION_MS = 220;
const REDUCED_MOTION_SPLASH_DURATION_MS = 350;
const REDUCED_MOTION_EXIT_DURATION_MS = 20;
const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard · Personal Expense Manager",
  "/transactions": "Transactions · Personal Expense Manager",
  "/about": "About · Personal Expense Manager",
  "/profile": "My Profile · Personal Expense Manager",
  "/login": "Sign in · Personal Expense Manager",
  "/register": "Create account · Personal Expense Manager",
};

function SessionCheck() {
  return (
    <main className="session-check" role="status" aria-live="polite">
      <LoaderCircle className="auth-spinner" aria-hidden="true" />
      <span>Restoring your secure session…</span>
    </main>
  );
}

function AuthenticationRouter() {
  const auth = useAuth();
  const [pathname, setPathname] = useState(window.location.pathname);
  const [hasVisitedDashboard, setHasVisitedDashboard] = useState(pathname !== "/transactions");
  const [hasVisitedTransactions, setHasVisitedTransactions] = useState(pathname === "/transactions");
  const [hasVisitedAbout, setHasVisitedAbout] = useState(pathname === "/about");
  const [hasVisitedProfile, setHasVisitedProfile] = useState(pathname === "/profile");
  const isAuthPath = pathname === "/login" || pathname === "/register";

  useEffect(() => {
    const updatePathname = () => {
      const nextPathname = window.location.pathname;
      setPathname(nextPathname);
      if (nextPathname !== "/transactions" && nextPathname !== "/about" && nextPathname !== "/login" && nextPathname !== "/register") {
        setHasVisitedDashboard(true);
      }
      if (nextPathname === "/transactions") setHasVisitedTransactions(true);
      if (nextPathname === "/about") setHasVisitedAbout(true);
      if (nextPathname === "/profile") setHasVisitedProfile(true);
    };
    window.addEventListener("popstate", updatePathname);
    return () => window.removeEventListener("popstate", updatePathname);
  }, []);

  useEffect(() => {
    document.title = PAGE_TITLES[pathname] ?? PAGE_TITLES["/"];
  }, [pathname]);

  useEffect(() => {
    if (auth.status === "unauthenticated" && !isAuthPath) {
      navigateTo("/login", true);
    } else if (auth.status === "authenticated" && isAuthPath) {
      navigateTo("/", true);
    }
  }, [auth.status, isAuthPath]);

  if (auth.status === "checking") return <SessionCheck />;

  if (auth.status === "error") {
    return (
      <SessionRestoreError
        message={auth.errorMessage ?? "We could not verify your saved session."}
        onRetry={auth.retrySessionRestore}
        onSignOut={() => signOut(auth.logout)}
      />
    );
  }

  if (auth.status === "unauthenticated") {
    return <AuthPage mode={pathname === "/register" ? "register" : "login"} />;
  }

  const isTransactionsPage = pathname === "/transactions";
  const isAboutPage = pathname === "/about";
  const isProfilePage = pathname === "/profile";
  const activePage = isTransactionsPage ? "Transactions" : isAboutPage ? "About" : isProfilePage ? null : "Dashboard";

  return (
    <div className="authenticated-app">
      <AppHeader activePage={activePage} />
      <div className="authenticated-content">
        {hasVisitedDashboard ? (
          <div
            className={`route-screen${isTransactionsPage || isAboutPage || isProfilePage ? " route-screen-offscreen" : ""}`}
            aria-hidden={isTransactionsPage || isAboutPage || isProfilePage}
            inert={isTransactionsPage || isAboutPage || isProfilePage}
          >
            <DashboardPage />
          </div>
        ) : null}
        {hasVisitedTransactions ? (
          <div
            className={`route-screen${!isTransactionsPage || isAboutPage || isProfilePage ? " route-screen-offscreen" : ""}`}
            aria-hidden={!isTransactionsPage || isAboutPage || isProfilePage}
            inert={!isTransactionsPage || isAboutPage || isProfilePage}
          >
            <TransactionsPage />
          </div>
        ) : null}
        {hasVisitedAbout ? (
          <div
            className={`route-screen${!isAboutPage || isProfilePage ? " route-screen-offscreen" : ""}`}
            aria-hidden={!isAboutPage || isProfilePage}
            inert={!isAboutPage || isProfilePage}
          >
            <AboutPage />
          </div>
        ) : null}
        {hasVisitedProfile ? (
          <div
            className={`route-screen${!isProfilePage ? " route-screen-offscreen" : ""}`}
            aria-hidden={!isProfilePage}
            inert={!isProfilePage}
          >
            <ProfilePage />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BrandSplash({ isExiting }: { isExiting: boolean }) {
  return (
    <main className={`brand-splash${isExiting ? " brand-splash-exiting" : ""}`} role="status" aria-live="polite" aria-label="Personal Expense Manager is loading">
      <div className="brand-splash-content">
        <div className="brand-splash-logo-wrap">
          <span className="brand-splash-orbit brand-splash-orbit-one" />
          <span className="brand-splash-orbit brand-splash-orbit-two" />
          <img className="brand-splash-logo" src="/em-logo.png" alt="" />
        </div>
        <p className="brand-splash-caption">Your finances, in clear view.</p>
        <span className="brand-splash-progress" aria-hidden="true"><i /></span>
      </div>
    </main>
  );
}

function AppExperience() {
  const auth = useAuth();
  const [isFirstVisit] = useState(
    () => window.sessionStorage.getItem(SPLASH_SESSION_KEY) !== "true",
  );
  const [splashMinimumElapsed, setSplashMinimumElapsed] = useState(!isFirstVisit);
  const [splashExitComplete, setSplashExitComplete] = useState(!isFirstVisit);

  useEffect(() => {
    if (!isFirstVisit) return;

    window.sessionStorage.setItem(SPLASH_SESSION_KEY, "true");
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = prefersReducedMotion
      ? REDUCED_MOTION_SPLASH_DURATION_MS
      : SPLASH_DURATION_MS;
    const timer = window.setTimeout(() => setSplashMinimumElapsed(true), duration);
    return () => window.clearTimeout(timer);
  }, [isFirstVisit]);

  const shouldFadeSplash = isFirstVisit && splashMinimumElapsed && auth.status !== "checking";

  useEffect(() => {
    if (!shouldFadeSplash) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = prefersReducedMotion
      ? REDUCED_MOTION_EXIT_DURATION_MS
      : SPLASH_EXIT_DURATION_MS;
    const timer = window.setTimeout(() => setSplashExitComplete(true), duration);
    return () => window.clearTimeout(timer);
  }, [shouldFadeSplash]);

  if (isFirstVisit && !splashExitComplete) return <BrandSplash isExiting={shouldFadeSplash} />;
  if (auth.status === "checking") return <SessionCheck />;

  return <AuthenticationRouter />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppExperience />
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}
