import type { ReactNode } from "react";

type PageActionsProps = {
  children: ReactNode;
};

export const PageActions = ({ children }: PageActionsProps) => {
  return <div className="hidden items-center gap-3 lg:flex">{children}</div>;
};
