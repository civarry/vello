import { Skeleton } from "@/components/ui/skeleton";

export default function GenerateDocumentsLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header Skeleton */}
      <div className="hidden md:flex h-14 items-center justify-between border-b bg-background px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-md" />
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-32 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      </div>

      {/* Mobile Header Skeleton */}
      <div className="md:hidden flex h-12 items-center justify-between border-b bg-background px-3 shrink-0">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>

      {/* Content Skeleton */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {/* Toolbar Skeleton */}
        <div className="p-2 border-b flex items-center gap-2 bg-muted/20">
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
          <div className="flex-1" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>

        {/* Table Skeleton */}
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-3">
            {/* Header Row */}
            <div className="flex gap-4 pb-3 border-b">
              <Skeleton className="h-6 w-8" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-8" />
            </div>
            {/* Data Rows */}
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4 py-2">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        </div>

        {/* Footer Skeleton */}
        <div className="p-2 border-t bg-muted/20 flex justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}
