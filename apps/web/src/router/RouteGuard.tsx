import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type { SystemRole } from "@live-crm/shared";
import { useAuth } from "../hooks/useAuth";

export function RouteGuard({
  children,
  role,
}: {
  children: ReactNode;
  role: SystemRole;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="page-loader">
        <span className="spinner" />
        <p>Loading your workspace</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.systemRole !== role) {
    return (
      <Navigate
        to={user.systemRole === "ADMIN" ? "/admin" : "/dashboard"}
        replace
      />
    );
  }

  return children;
}
