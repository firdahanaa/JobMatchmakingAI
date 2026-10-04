import { Skeleton } from "@/components/ui/skeleton";

export default function TalentProjectsLoading() {
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
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Header Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-8 w-60 rounded-md" />
            <Skeleton className="h-4 w-96 rounded-md" />
          </div>

          {/* Search & Filter Bar Skeleton */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          </div>

          {/* Project Cards Skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-36 w-full rounded-2xl" />
            <Skeleton className="h-36 w-full rounded-2xl" />
            <Skeleton className="h-36 w-full rounded-2xl" />
          </div>
        </div>
      </main>
    </div>
  );
}
