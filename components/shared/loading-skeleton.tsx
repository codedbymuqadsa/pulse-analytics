import { Card, CardContent, Skeleton } from "@/components/ui/card";

export function KpiSkeletonRow({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i}><CardContent className="space-y-3"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-8 w-2/3" /><Skeleton className="h-4 w-1/3" /></CardContent></Card>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <Card><CardContent className="space-y-4"><Skeleton className="h-5 w-40" /><Skeleton style={{ height }} className="w-full" /></CardContent></Card>
  );
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="space-y-6">
      <div className="space-y-2"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-72" /></div>
      <KpiSkeletonRow />
      <div className="grid gap-4 lg:grid-cols-3"><div className="lg:col-span-2"><ChartSkeleton /></div><ChartSkeleton /></div>
      <ChartSkeleton height={200} />
    </div>
  );
}
