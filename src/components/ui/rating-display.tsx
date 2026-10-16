import { StarRating } from "@/components/ui/star-rating";
import { cn } from "@/lib/utils";

export interface RatingDisplayProps {
  rating: number | null | undefined;
  reviewCount?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function formatRatingDisplay(rating: number | null | undefined): string {
  return rating == null ? "Belum ada rating" : `${rating.toFixed(1)} / 5.0`;
}

export function RatingDisplay({
  rating,
  reviewCount,
  size = "sm",
  className,
}: RatingDisplayProps) {
  if (rating == null) {
    return (
      <span className={cn("text-xs font-medium text-slate-500", className)}>
        Belum ada rating
      </span>
    );
  }

  return (
    <div className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      <StarRating value={rating} readOnly size={size} />
      <span className="text-xs font-semibold tabular-nums text-slate-700">
        {formatRatingDisplay(rating)}
      </span>
      {reviewCount != null && (
        <span className="text-xs text-slate-500">({reviewCount} ulasan)</span>
      )}
    </div>
  );
}
