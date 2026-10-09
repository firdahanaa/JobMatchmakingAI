import * as React from "react";
import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex h-11 w-full rounded-full border border-white/80 bg-[#f5f0ec] px-5 py-2 text-sm text-[#0F172A] shadow-sm shadow-slate-400/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 focus-visible:bg-white disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

export { Select };
