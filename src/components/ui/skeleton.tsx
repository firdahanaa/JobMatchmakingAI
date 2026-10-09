import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-[#e8d5d0] dark:bg-[#5c4639]", className)}
      {...props}
    />
  );
}

export { Skeleton };
