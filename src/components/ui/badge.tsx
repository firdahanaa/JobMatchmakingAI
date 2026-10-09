import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border border-sky-200 bg-sky-100 text-sky-800 hover:bg-sky-200/80",
        secondary:
          "border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200/80",
        destructive:
          "border border-rose-200 bg-rose-100 text-rose-800 hover:bg-rose-200/80",
        outline:
          "text-[#0F172A] border border-sky-200 bg-white hover:bg-sky-50",
        success:
          "border border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-200/80",
        warning:
          "border border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-200/80",
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
