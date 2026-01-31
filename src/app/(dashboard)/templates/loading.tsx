import { Skeleton } from "@/components/ui/skeleton";

function TemplateCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
          <div className="space-y-2 min-w-0 flex-1">
            <Skeleton className="h-4 w-3/4 max-w-[128px]" />
            <Skeleton className="h-3 w-1/2 max-w-[80px]" />
          </div>
        </div>
        <Skeleton className="h-8 w-8 rounded-md shrink-0" />
      </div>
      <Skeleton className="h-3 w-full mt-3 ml-12" />
      <div className="flex gap-2 mt-4 ml-12">
        <Skeleton className="h-8 flex-1 rounded-md" />
        <Skeleton className="h-8 w-10 rounded-md shrink-0" />
      </div>
      <div className="mt-3 pt-3 border-t ml-12">
        <Skeleton className="h-3 w-1/3 max-w-[112px]" />
      </div>
    </div>
  );
}

export default function TemplatesLoading() {
  return (
    <div className="w-full max-w-full p-4 sm:p-6 lg:p-8">
      {/* Header Skeleton */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-28 sm:w-32" />
          <Skeleton className="h-4 w-48 sm:w-56" />
        </div>
        <Skeleton className="h-10 w-full sm:w-36 rounded-md" />
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
