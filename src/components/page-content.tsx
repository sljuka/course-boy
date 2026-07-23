import type { ReactNode } from "react";

export const PageContent = ({ children }: { children: ReactNode }) => {
  return <div className="flex w-full max-w-7xl flex-col gap-4">{children}</div>;
};
