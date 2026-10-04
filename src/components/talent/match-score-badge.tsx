import React from "react";
import { Sparkles, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface MatchScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

/**
 * Match Score Badge with color coding according to PRD:
 * - score >= 85: Green (Emerald)
 * - 70 <= score < 85: Yellow (Amber)
 * - score < 70: Gray (Slate)
 */
export function MatchScoreBadge({
  score,
  size = "md",
  showIcon = true,
  className,
}: MatchScoreBadgeProps) {
  const clampedScore = Math.min(100, Math.max(0, Math.round(score)));

  let colorClasses = "";
  let iconClasses = "";

  if (clampedScore >= 85) {
    colorClasses =
      "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
    iconClasses = "text-emerald-600 dark:text-emerald-400";
  } else if (clampedScore >= 70) {
    colorClasses =
      "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
    iconClasses = "text-amber-600 dark:text-amber-400";
  } else {
    colorClasses =
      "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    iconClasses = "text-slate-500 dark:text-slate-400";
  }

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs font-semibold gap-1",
    md: "px-2.5 py-1 text-xs sm:text-sm font-semibold gap-1.5",
    lg: "px-3.5 py-1.5 text-sm sm:text-base font-bold gap-2",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border transition-colors shadow-2xs select-none",
        sizeClasses[size],
        colorClasses,
        className
      )}
      title={`Match Score: ${clampedScore}%`}
    >
      {showIcon && (
        clampedScore >= 85 ? (
          <Sparkles className={cn(iconSizes[size], iconClasses)} />
        ) : (
          <Target className={cn(iconSizes[size], iconClasses)} />
        )
      )}
      <span>{clampedScore}% Match</span>
    </div>
  );
}
