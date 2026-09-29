import { Navigate, Outlet } from "react-router-dom";

import type { UserRole } from "@/lib/preferences";
import { useAppState } from "@/lib/use-app-state";

type RoleRouteProps = {
  roles: UserRole | UserRole[];
};

// A layout route that renders its child routes only for the given roles, and
// sends anyone else Home. Hiding a link isn't enough: teacher pages stay
// reachable through back/forward, recently viewed and direct links after the
// role changes in Settings.
function RoleRoute({ roles }: RoleRouteProps) {
  const { isLoaded, role } = useAppState();
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  if (!isLoaded) {
    return null;
  }

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate replace to="/" />;
  }

  return <Outlet />;
}

export { RoleRoute };
