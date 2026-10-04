import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-indigo-100 text-indigo-700 hover:bg-indigo-200/80 dark:bg-indigo-100 dark:text-indigo-700",
        secondary:
          "border-transparent bg-slate-200/70 text-slate-800 hover:bg-slate-200 dark:bg-slate-200/70 dark:text-slate-800",
        destructive:
          "border-transparent bg-rose-100 text-rose-700 hover:bg-rose-200/80 dark:bg-rose-100 dark:text-rose-700",
        outline:
          "text-slate-700 border border-slate-300 dark:text-slate-700 dark:border-slate-300",
        success:
          "border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-200/80 dark:bg-emerald-100 dark:text-emerald-800",
        warning:
          "border-transparent bg-amber-100 text-amber-800 hover:bg-amber-200/80 dark:bg-amber-100 dark:text-amber-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
