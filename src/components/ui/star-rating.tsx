"use client";

import React, { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StarRatingProps {
  value: number; // 0 - 5 (bisa desimal untuk read-only, mis. 4.8)
  onChange?: (value: number) => void;
  max?: number;
  size?: "sm" | "md" | "lg";
  readOnly?: boolean;
  disabled?: boolean;
  showValue?: boolean;
  label?: string;
  className?: string;
}

export function StarRating({
  value = 0,
  onChange,
  max = 5,
  size = "md",
  readOnly = false,
  disabled = false,
  showValue = false,
  label,
  className,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const isInteractive = !readOnly && !disabled && !!onChange;
  const activeValue = hoverValue !== null ? hoverValue : value;

  const sizeClasses = {
    sm: "h-3.5 w-3.5",
    md: "h-5 w-5",
    lg: "h-7 w-7",
  }[size];

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base font-bold",
  }[size];

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      {label && (
        <span className="text-xs font-medium text-[#7a6559] mr-1">{label}</span>
      )}

      <div
        className="inline-flex items-center gap-1"
        role={isInteractive ? "radiogroup" : undefined}
        aria-label={label || "Penilaian bintang"}
        onMouseLeave={() => {
          if (isInteractive) setHoverValue(null);
        }}
      >
        {Array.from({ length: max }, (_, index) => {
          const starNumber = index + 1;
          const isFilled = activeValue >= starNumber;
          const isHalfFilled =
            !isFilled && activeValue >= starNumber - 0.5 && readOnly;

          return (
            <button
              key={starNumber}
              type="button"
              disabled={!isInteractive}
              onClick={() => {
                if (isInteractive && onChange) {
                  onChange(starNumber);
                }
              }}
              onMouseEnter={() => {
                if (isInteractive) {
                  setHoverValue(starNumber);
                }
              }}
              className={cn(
                "transition-all duration-150 relative p-0.5 rounded-sm focus:outline-hidden",
                isInteractive
                  ? "cursor-pointer hover:scale-115 active:scale-95 focus-visible:ring-2 focus-visible:ring-amber-400"
                  : "cursor-default select-none pointer-events-none"
              )}
              aria-label={`${starNumber} bintang`}
              aria-checked={isInteractive ? value === starNumber : undefined}
              role={isInteractive ? "radio" : undefined}
            >
              <Star
                className={cn(
                  sizeClasses,
                  "transition-colors duration-150",
                  isFilled
                    ? "fill-slate-400 text-slate-500 drop-shadow-2xs"
                    : isHalfFilled
                      ? "fill-slate-400/50 text-slate-500"
                    : "fill-transparent text-[#d4b0a5]"
                )}
              />
            </button>
          );
        })}
      </div>

      {showValue && (
        <span
          className={cn(
            "font-semibold text-[#695449] ml-1 tabular-nums",
            textSizeClasses
          )}
        >
          {value > 0 ? value.toFixed(1) : "0.0"}
        </span>
      )}
    </div>
  );
}
