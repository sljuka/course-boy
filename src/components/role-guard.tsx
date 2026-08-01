import type { ReactNode } from "react";

import { useAppState } from "@/lib/use-app-state";
import type { UserRole } from "@/lib/preferences";

type RoleGuardProps = {
  children: ReactNode;
  roles: UserRole | UserRole[];
};

function RoleGuard({ children, roles }: RoleGuardProps) {
  const { isLoaded, role: currentRole } = useAppState();
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  if (!isLoaded || !currentRole) {
    return null;
  }

  if (!allowedRoles.includes(currentRole)) {
    return null;
  }

  return <>{children}</>;
}

export { RoleGuard };
export type { RoleGuardProps };
