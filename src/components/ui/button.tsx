import * as React from "react";
import { type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export const Button = ({
  appearance,
  className,
  size,
  type = "button",
  variant,
  ...props
}: ButtonProps) => {
  return (
    <button
      className={cn(buttonVariants({ appearance, className, size, variant }))}
      type={type}
      {...props}
    />
  );
};
