import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { UserRole } from "@/lib/api/types";
import { useAuth } from "@/portal/auth-context";

export function ProtectedRoute({
  children,
  allow,
}: {
  children: ReactNode;
  allow?: UserRole[];
}) {
  const location = useLocation();
  const { user, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading portal...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/portal/login" state={{ from: location }} replace />;
  }

  if (allow && !allow.includes(user.role)) {
    return <Navigate to={roleHomeRoute(user.role)} replace />;
  }

  return <>{children}</>;
}

export function roleHomeRoute(role: UserRole) {
  if (role === "ADMIN") return "/portal/admin";
  if (role === "DOCTOR") return "/portal/doctor";
  if (role === "SPECIALIST") return "/portal/specialist";
  if (role === "PATIENT") return "/portal/patient";
  return "/portal/family";
}
