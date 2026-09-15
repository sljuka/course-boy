import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type PageHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  top?: ReactNode;
  className?: string;
};

export const PageHeader = ({
  title,
  subtitle,
  right,
  children,
  top,
  className,
}: PageHeaderProps) => {
  return (
    <div className={cn(className, "flex flex-col gap-2")}>
      {top}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1">
            {title}
            {subtitle}
          </div>
        </div>
        {right && (
          <div className="hidden items-center gap-3 self-start lg:flex">
            {right}
          </div>
        )}
      </div>
      {children}
    </div>
  );
};
