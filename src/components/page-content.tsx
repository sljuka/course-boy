import type { ReactNode } from "react";

type PageContentProps = {
  children: ReactNode;
};

export const PageContent = ({ children }: PageContentProps) => {
  return <div className="mx-auto flex w-full max-w-xl flex-col gap-4 p-5">{children}</div>;
};
