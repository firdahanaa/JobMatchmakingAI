import { Skeleton } from "@/components/ui/skeleton";

export default function VendorDashboardLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Navbar Placeholder */}
      <div className="border-b border-slate-200 bg-white py-3.5 px-4 sm:px-8">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <Skeleton className="h-8 w-36 rounded-lg" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </div>

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* Welcome Banner Skeleton */}
          <Skeleton className="h-44 w-full rounded-2xl" />

          {/* Quick Metrics Skeleton: 4 cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>

          {/* Projects Management Skeleton */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-48 rounded-md" />
              <Skeleton className="h-8 w-32 rounded-lg" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-44 w-full rounded-2xl" />
              <Skeleton className="h-44 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
