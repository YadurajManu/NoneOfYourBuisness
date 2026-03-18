import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { AuthUser } from "@/lib/api/types";
import {
  clearAccessToken,
  login,
  logout,
  refreshSession,
  register,
  setAccessToken,
} from "@/lib/api/client";

type AuthContextValue = {
  user: AuthUser | null;
  isBootstrapping: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (orgName: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setSession: (token: string, user: AuthUser) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    if (localStorage.getItem("ml_has_session") !== "1") {
      setIsBootstrapping(false);
      return;
    }

    let mounted = true;

    refreshSession()
      .then((res) => {
        if (!mounted) return;
        setUser(res.user);
      })
      .catch(() => {
        if (!mounted) return;
        clearAccessToken();
        setUser(null);
      })
      .finally(() => {
        if (mounted) setIsBootstrapping(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const setSession = useCallback((token: string, nextUser: AuthUser) => {
    setAccessToken(token);
    setUser(nextUser);
    localStorage.setItem("ml_has_session", "1");
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await login(email, password);
    setSession(res.access_token, res.user);
  }, [setSession]);

  const signUp = useCallback(
    async (orgName: string, email: string, password: string) => {
      const res = await register(orgName, email, password);
      setSession(res.access_token, res.user);
    },
    [setSession],
  );

  const signOut = useCallback(async () => {
    try {
      await logout();
    } finally {
      clearAccessToken();
      setUser(null);
      localStorage.removeItem("ml_has_session");
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isBootstrapping, signIn, signUp, signOut, setSession }),
    [isBootstrapping, setSession, signIn, signOut, signUp, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return ctx;
}
