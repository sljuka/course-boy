import type { ReactNode } from "react";

type PageContentProps = {
  children: ReactNode;
};

export const PageContent = ({ children }: PageContentProps) => {
  return <div className="flex flex-col gap-4 p-5">{children}</div>;
};
