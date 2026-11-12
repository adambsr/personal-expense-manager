import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowRight, LoaderCircle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/use-auth";
import { AuthApiError } from "@/features/auth/auth-api";
import { credentialsSchema, type Credentials } from "@/features/auth/auth-validation";
import { handleClientNavigation, navigateTo } from "@/lib/navigation";

type AuthMode = "login" | "register";

export function AuthPage({ mode }: { mode: AuthMode }) {
  const { login, register } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<Credentials>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  });
  const isRegistering = mode === "register";

  async function submitCredentials(credentials: Credentials) {
    setServerError(null);

    try {
      if (isRegistering) {
        await register(credentials);
      } else {
        await login(credentials);
      }
      navigateTo("/", true);
    } catch (error) {
      if (error instanceof AuthApiError && error.details.length > 0) {
        setServerError(error.details.map(({ message }) => message).join(" "));
      } else {
        setServerError(
          error instanceof Error ? error.message : "We could not complete your request. Please try again.",
        );
      }
    }
  }

  const emailError = form.formState.errors.email?.message;
  const passwordError = form.formState.errors.password?.message;

  return (
    <main className="auth-screen">
      <div className="auth-brand-row">
        <a className="auth-brand" href="/login" aria-label="Personal Expense Manager home" onClick={(event) => handleClientNavigation(event, "/login")}>
          <img className="auth-brand-logo" src="/em-logo.png" alt="Personal Expense Manager" />
        </a>
      </div>

      <div className="auth-layout">
        <section className="auth-introduction" aria-labelledby="auth-intro-title">
          <div className="auth-intro-mark" aria-hidden="true">
            <div className="intro-mark-line intro-mark-line-one" />
            <div className="intro-mark-line intro-mark-line-two" />
            <div className="intro-mark-line intro-mark-line-three" />
            <div className="intro-mark-base" />
          </div>
          <h1 id="auth-intro-title">Your finances,<br /><span>in clear view.</span></h1>
          <p>Keep your income and spending together in one calm, easy-to-understand overview.</p>
          <div className="auth-intro-rule" />
          <span className="auth-intro-caption">A clearer picture starts here.</span>
        </section>

        <Card className="auth-card">
          <div className="auth-card-heading">
            <span className="auth-eyebrow">PERSONAL EXPENSE MANAGER</span>
            <h2>{isRegistering ? "Create your account" : "Welcome back"}</h2>
            <p>
              {isRegistering
                ? "Start organizing your personal finances."
                : "Sign in to see your financial overview."}
            </p>
          </div>

          {serverError ? <div className="auth-error" role="alert">{serverError}</div> : null}

          <form className="auth-form" onSubmit={form.handleSubmit(submitCredentials)} noValidate>
            <div className="auth-field">
              <Label htmlFor="auth-email">Email address</Label>
              <Input
                id="auth-email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? "auth-email-error" : undefined}
                {...form.register("email")}
              />
              {emailError ? <p className="field-error" id="auth-email-error">{emailError}</p> : null}
            </div>

            <div className="auth-field">
              <Label htmlFor="auth-password">Password</Label>
              <PasswordInput
                id="auth-password"
                placeholder={isRegistering ? "At least 8 characters" : "Enter your password"}
                autoComplete={isRegistering ? "new-password" : "current-password"}
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordError ? "auth-password-error" : "auth-password-hint"}
                {...form.register("password")}
              />
              {passwordError ? (
                <p className="field-error" id="auth-password-error">{passwordError}</p>
              ) : isRegistering ? (
                <p className="field-hint" id="auth-password-hint">Use 8 to 128 characters.</p>
              ) : null}
            </div>

            <Button className="auth-submit" type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <><LoaderCircle className="auth-spinner" aria-hidden="true" />
                  {isRegistering ? "Creating account…" : "Signing in…"}</>
              ) : (
                <>{isRegistering ? "Create account" : "Sign in"}<ArrowRight aria-hidden="true" /></>
              )}
            </Button>
          </form>

          <p className="auth-switch">
            {isRegistering ? "Already have an account?" : "New to Personal Expense Manager?"}{" "}
            <a href={isRegistering ? "/login" : "/register"} onClick={(event) => handleClientNavigation(event, isRegistering ? "/login" : "/register")}>
              {isRegistering ? "Sign in" : "Create an account"}
            </a>
          </p>
        </Card>
      </div>

      <footer className="auth-footer">Personal finances, clearly.</footer>
    </main>
  );
}

export function SessionRestoreError({
  message,
  onRetry,
  onSignOut,
}: {
  message: string;
  onRetry: () => void;
  onSignOut: () => void;
}) {
  return (
    <main className="auth-screen session-screen">
      <Card className="session-card">
        <span className="auth-brand-mark session-mark" aria-hidden="true"><Wallet size={19} /></span>
        <h1>We couldn’t restore your session</h1>
        <p role="alert">{message}</p>
        <Button className="auth-submit" onClick={onRetry}>Try again</Button>
        <Button variant="ghost" onClick={onSignOut}>Sign in again</Button>
      </Card>
    </main>
  );
}
