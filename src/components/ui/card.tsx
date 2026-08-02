import * as React from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-stone-300/80 bg-white p-6 shadow-[0_24px_80px_-32px_rgba(41,37,36,0.35)]",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({
  children,
  className,
  subtitle,
  title,
  ...props
}: Omit<React.HTMLAttributes<HTMLDivElement>, "title"> & {
  children?: ReactNode;
  subtitle?: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)} {...props}>
      {title}
      {subtitle}
      {children}
    </div>
  );
}

function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        "text-3xl font-semibold leading-tight tracking-tight text-stone-950",
        className,
      )}
      {...props}
    />
  );
}

function LessonTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        "text-2xl font-semibold leading-tight tracking-tight text-stone-950",
        className,
      )}
      {...props}
    />
  );
}

function CourseTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        "text-3xl font-semibold leading-tight tracking-tight text-stone-950",
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm leading-6 text-stone-600", className)}
      {...props}
    />
  );
}

function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-4", className)} {...props} />;
}

export {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CourseTitle,
  LessonTitle,
};
