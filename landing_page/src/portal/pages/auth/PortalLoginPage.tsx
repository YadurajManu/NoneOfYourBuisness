import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Building2,
  Check,
  Loader2,
  Lock,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { roleHomeRoute } from "@/portal/protected-route";
import { useAuth } from "@/portal/auth-context";
import { AuthBrandPanel } from "./components/AuthBrandPanel";
import { AuthFooterLinks } from "./components/AuthFooterLinks";
import { PasswordField } from "./components/PasswordField";

type Mode = "signin" | "signup";

const ease = [0.16, 1, 0.3, 1] as const;

function Field({
  id,
  label,
  children,
  error,
}: {
  id: string;
  label: string;
  children: ReactNode;
  error?: string | null;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-[13px] text-foreground/90">
        {label}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-[12px] text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const inputClass =
  "h-11 rounded-xl border-white/[0.08] bg-white/[0.03] text-sm transition-colors placeholder:text-muted-foreground/55 focus-visible:ring-primary/40";

export default function PortalLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isBootstrapping, signIn, signUp } = useAuth();

  const initialMode: Mode =
    searchParams.get("mode") === "signup" ? "signup" : "signin";
  const nextPath = searchParams.get("next");
  const expired = searchParams.get("reason") === "session";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sessionBanner, setSessionBanner] = useState(expired);

  useEffect(() => {
    if (user) {
      const dest =
        nextPath && nextPath.startsWith("/portal")
          ? nextPath
          : roleHomeRoute(user.role);
      navigate(dest, { replace: true });
    }
  }, [navigate, nextPath, user]);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setFieldErrors({});
    setPassword("");
    setConfirmPassword("");
    setAcceptedTerms(false);
  }

  function validate(): boolean {
    const next: Record<string, string> = {};

    if (!email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "Enter a valid work email.";
    }

    if (!password) next.password = "Password is required.";
    else if (password.length < 8) {
      next.password = "Password must be at least 8 characters.";
    }

    if (mode === "signup") {
      if (!orgName.trim() || orgName.trim().length < 2) {
        next.orgName = "Organization name must be at least 2 characters.";
      }
      if (!adminName.trim() || adminName.trim().length < 2) {
        next.adminName = "Enter your full name.";
      }
      if (password !== confirmPassword) {
        next.confirmPassword = "Passwords do not match.";
      }
      if (!acceptedTerms) {
        next.terms = "Accept the Terms and Privacy Policy to continue.";
      }
    }

    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSessionBanner(false);

    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email.trim(), password);
      } else {
        // Backend currently accepts org + email + password; admin name is
        // captured for a clearer UX and can be wired when profile API expands.
        void adminName;
        await signUp(orgName.trim(), email.trim(), password);
      }
      navigate(
        nextPath && nextPath.startsWith("/portal") ? nextPath : "/portal",
        { replace: true },
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to authenticate";
      const lower = message.toLowerCase();
      if (
        lower.includes("unauthorized") ||
        lower.includes("invalid") ||
        lower.includes("credentials")
      ) {
        setError("Email or password is incorrect. Please try again.");
      } else if (lower.includes("suspended")) {
        setError("This account has been suspended. Contact your administrator.");
      } else if (lower.includes("already") || lower.includes("exists")) {
        setError("An account with this email already exists. Sign in instead.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  const headline = useMemo(
    () =>
      mode === "signin"
        ? "Sign in to your workspace"
        : "Create your organization",
    [mode],
  );

  const subcopy = useMemo(
    () =>
      mode === "signin"
        ? "Secure access for clinicians, care teams, patients, and families."
        : "Set up an admin account and organization. Invite your care team after setup.",
    [mode],
  );

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm">Checking your session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AuthBrandPanel />

      <main className="relative flex flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4 lg:hidden">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
              <Activity className="h-4 w-4" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">
              Aarogya<span className="text-[var(--brand-accent)]">360</span>
            </span>
          </Link>
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Lock className="h-3 w-3 text-primary/80" />
            Secure
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <motion.div
            layout
            className="w-full max-w-[420px]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease }}
          >
            <div className="mb-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.28, ease }}
                >
                  <h1 className="font-display text-[1.65rem] font-bold tracking-[-0.03em] text-foreground sm:text-[1.85rem]">
                    {headline}
                  </h1>
                  <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                    {subcopy}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Mode switch — sign-in primary, org secondary */}
            <div
              className="mb-6 grid grid-cols-2 gap-1 rounded-xl border border-white/[0.07] bg-white/[0.02] p-1"
              role="tablist"
              aria-label="Authentication mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "signin"}
                onClick={() => switchMode("signin")}
                className={cn(
                  "relative rounded-lg py-2.5 text-[13px] font-medium transition-colors",
                  mode === "signin"
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {mode === "signin" ? (
                  <motion.span
                    layoutId="auth-mode-pill"
                    className="absolute inset-0 rounded-lg bg-primary shadow-[0_0_0_1px_rgba(0,196,180,0.25)]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                ) : null}
                <span className="relative z-10">Sign in</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "signup"}
                onClick={() => switchMode("signup")}
                className={cn(
                  "relative rounded-lg py-2.5 text-[13px] font-medium transition-colors",
                  mode === "signup"
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {mode === "signup" ? (
                  <motion.span
                    layoutId="auth-mode-pill"
                    className="absolute inset-0 rounded-lg bg-primary shadow-[0_0_0_1px_rgba(0,196,180,0.25)]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                ) : null}
                <span className="relative z-10">Create org</span>
              </button>
            </div>

            <AnimatePresence>
              {sessionBanner ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 overflow-hidden"
                >
                  <Alert className="border-amber/30 bg-amber/10 text-foreground">
                    <AlertCircle className="h-4 w-4 text-amber" />
                    <AlertTitle className="text-sm">Session expired</AlertTitle>
                    <AlertDescription className="text-[13px] text-muted-foreground">
                      Sign in again to continue where you left off.
                    </AlertDescription>
                  </Alert>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {error ? (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="mb-4"
                >
                  <Alert variant="destructive" className="bg-destructive/10">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="text-sm">
                      {mode === "signin" ? "Sign-in failed" : "Registration failed"}
                    </AlertTitle>
                    <AlertDescription className="text-[13px]">{error}</AlertDescription>
                  </Alert>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <AnimatePresence mode="wait" initial={false}>
                {mode === "signup" ? (
                  <motion.div
                    key="signup-fields"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25, ease }}
                    className="space-y-4"
                  >
                    <Field id="orgName" label="Organization name" error={fieldErrors.orgName}>
                      <div className="relative">
                        <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                        <Input
                          id="orgName"
                          value={orgName}
                          onChange={(e) => setOrgName(e.target.value)}
                          placeholder="e.g. Northside Care Clinic"
                          autoComplete="organization"
                          disabled={loading}
                          aria-invalid={fieldErrors.orgName ? true : undefined}
                          className={cn(inputClass, "pl-10", fieldErrors.orgName && "border-destructive/50")}
                        />
                      </div>
                    </Field>

                    <Field id="adminName" label="Your full name" error={fieldErrors.adminName}>
                      <Input
                        id="adminName"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        placeholder="Admin full name"
                        autoComplete="name"
                        disabled={loading}
                        aria-invalid={fieldErrors.adminName ? true : undefined}
                        className={cn(inputClass, fieldErrors.adminName && "border-destructive/50")}
                      />
                    </Field>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <Field id="email" label="Work email" error={fieldErrors.email}>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@clinic.com"
                  autoComplete="email"
                  disabled={loading}
                  aria-invalid={fieldErrors.email ? true : undefined}
                  className={cn(inputClass, fieldErrors.email && "border-destructive/50")}
                />
              </Field>

              <PasswordField
                id="password"
                label="Password"
                value={password}
                onChange={setPassword}
                error={fieldErrors.password}
                hint={mode === "signup" ? "At least 8 characters." : undefined}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                disabled={loading}
                placeholder="••••••••"
              />

              <AnimatePresence initial={false}>
                {mode === "signup" ? (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease }}
                    className="space-y-4 overflow-hidden"
                  >
                    <PasswordField
                      id="confirmPassword"
                      label="Confirm password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      error={fieldErrors.confirmPassword}
                      autoComplete="new-password"
                      disabled={loading}
                      placeholder="••••••••"
                    />

                    <div className="space-y-2">
                      <label className="flex cursor-pointer gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5 transition-colors hover:bg-white/[0.04]">
                        <input
                          type="checkbox"
                          checked={acceptedTerms}
                          onChange={(e) => setAcceptedTerms(e.target.checked)}
                          disabled={loading}
                          className="mt-0.5 h-4 w-4 rounded border-white/20 bg-transparent text-primary focus:ring-primary/40"
                        />
                        <span className="text-[13px] leading-snug text-muted-foreground">
                          I agree to the{" "}
                          <Link to="/terms" className="text-primary underline-offset-2 hover:underline">
                            Terms of Use
                          </Link>{" "}
                          and{" "}
                          <Link to="/privacy" className="text-primary underline-offset-2 hover:underline">
                            Privacy Policy
                          </Link>
                          .
                        </span>
                      </label>
                      {fieldErrors.terms ? (
                        <p className="text-[12px] text-destructive" role="alert">
                          {fieldErrors.terms}
                        </p>
                      ) : null}
                    </div>

                    <div className="rounded-xl border border-primary/15 bg-primary/[0.06] px-3.5 py-3">
                      <p className="flex items-start gap-2 text-[12.5px] leading-snug text-foreground/80">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        Creates an organization admin account. You can invite doctors,
                        specialists, patients, and families from the portal.
                      </p>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {mode === "signin" ? (
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-[12.5px] text-muted-foreground transition-colors hover:text-primary"
                    onClick={() =>
                      setError(
                        "Password reset is not enabled yet. Contact your organization admin for access recovery.",
                      )
                    }
                  >
                    Forgot password?
                  </button>
                </div>
              ) : null}

              <Button
                type="submit"
                disabled={loading}
                className="btn-shimmer h-11 w-full rounded-full text-sm font-semibold shadow-[0_0_0_1px_rgba(0,196,180,0.2),0_8px_24px_-8px_rgba(0,196,180,0.45)] transition-transform active:scale-[0.99]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {mode === "signin" ? "Signing you in…" : "Creating organization…"}
                  </>
                ) : (
                  <>
                    {mode === "signin" ? "Sign in" : "Create organization"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-[13px] text-muted-foreground">
              {mode === "signin" ? (
                <>
                  Starting a clinic?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    Create an organization
                  </button>
                </>
              ) : (
                <>
                  Already have access?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signin")}
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>

            <AuthFooterLinks />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
