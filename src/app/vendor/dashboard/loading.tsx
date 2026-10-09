import { Skeleton } from "@/components/ui/skeleton";

export default function VendorDashboardLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F7ECEA]">
      <main className="flex-1 py-2 sm:py-6 px-1 sm:px-3 lg:px-6 space-y-8">
        <div className="space-y-8">
          {/* Welcome Banner Skeleton */}
          <Skeleton className="h-[480px] w-full rounded-[2rem]" />

          {/* Quick Metrics Skeleton: 4 cards */}
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-2 sm:grid-cols-4 sm:px-4">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>

          {/* Projects Management Skeleton */}
          <div className="mx-auto max-w-7xl space-y-4 px-2 sm:px-4">
            <div className="space-y-1">
              <Skeleton className="h-7 w-64 rounded-md" />
              <Skeleton className="h-4 w-96 max-w-full rounded-md" />
            </div>
            <div className="space-y-3 rounded-[1.75rem] border border-[#e8d5d0] bg-white/80 p-4 sm:p-6">
              <Skeleton className="h-12 w-full rounded-2xl" />
              <Skeleton className="h-10 w-80 max-w-full rounded-xl" />
              <Skeleton className="h-44 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
