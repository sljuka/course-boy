import * as React from "react";
import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const cardVariants = cva("flex flex-col gap-4 rounded-3xl border p-6", {
  variants: {
    variant: {
      default:
        "border-stone-300/80 bg-white shadow-[0_24px_80px_-32px_rgba(41,37,36,0.35)]",
      muted:
        "border-stone-200 bg-stone-50/80 shadow-[0_16px_36px_-28px_rgba(41,37,36,0.18)]",
      dashed: "border-dashed border-stone-300 bg-stone-50/70 shadow-none",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

function Card({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>) {
  return (
    <div className={cn(cardVariants({ className, variant }))} {...props} />
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
        "text-2xl font-semibold leading-tight tracking-tight text-stone-950",
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
      className={cn("text-2xl text-gray-800 font-medium", className)}
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
      className={cn("text-sm leading-6 text-stone-500", className)}
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
