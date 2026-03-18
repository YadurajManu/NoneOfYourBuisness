import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { roleHomeRoute } from "@/portal/protected-route";
import { useAuth } from "@/portal/auth-context";

export default function PortalLoginPage() {
  const navigate = useNavigate();
  const { user, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      navigate(roleHomeRoute(user.role), { replace: true });
    }
  }, [navigate, user]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(orgName, email, password);
      }
      navigate("/portal", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to authenticate");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-card border border-foreground/10 rounded-2xl p-8">
        <h1 className="text-3xl font-display font-bold tracking-tight mb-2">
          Portal Access
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Secure access for admins, doctors, specialists, patients, and families.
        </p>

        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`flex-1 py-2 rounded-lg text-sm ${
              mode === "signin"
                ? "bg-primary/10 border border-primary/20 text-primary"
                : "bg-background border border-foreground/10 text-muted-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 py-2 rounded-lg text-sm ${
              mode === "signup"
                ? "bg-primary/10 border border-primary/20 text-primary"
                : "bg-background border border-foreground/10 text-muted-foreground"
            }`}
          >
            Register Org
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "signup" ? (
            <input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Organization name"
              className="w-full rounded-lg bg-background border border-foreground/10 px-4 py-3 text-sm"
              required
            />
          ) : null}

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-lg bg-background border border-foreground/10 px-4 py-3 text-sm"
            required
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-lg bg-background border border-foreground/10 px-4 py-3 text-sm"
            required
          />

          {error ? <p className="text-sm text-secondary">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-shimmer py-3 rounded-full text-sm font-semibold text-primary-foreground disabled:opacity-70"
          >
            {loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
