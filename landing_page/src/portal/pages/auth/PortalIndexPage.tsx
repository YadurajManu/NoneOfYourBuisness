import { Navigate } from "react-router-dom";
import { useAuth } from "@/portal/auth-context";
import { roleHomeRoute } from "@/portal/protected-route";

export default function PortalIndexPage() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/portal/login" replace />;
  }

  return <Navigate to={roleHomeRoute(user.role)} replace />;
}
