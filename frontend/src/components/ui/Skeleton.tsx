interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className = '', lines = 1 }: SkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`skeleton ${className}`} />
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="glass p-5 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function ExpenseRowSkeleton() {
  return (
    <div className="glass p-4 flex items-center gap-4">
      <Skeleton className="h-10 w-10 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-5 w-16" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="glass p-5 space-y-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}
