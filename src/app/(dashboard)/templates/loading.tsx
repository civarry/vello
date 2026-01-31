import { Skeleton } from "@/components/ui/skeleton";

function TemplateCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      <Skeleton className="h-3 w-full mt-3 ml-12" />
      <div className="flex gap-2 mt-4 ml-12">
        <Skeleton className="h-8 flex-1 rounded-md" />
        <Skeleton className="h-8 w-10 rounded-md" />
      </div>
      <div className="mt-3 pt-3 border-t ml-12">
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
  );
}

export default function TemplatesLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header Skeleton */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid gap-5 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <TemplateCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
