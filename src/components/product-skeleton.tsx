import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function ProductSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="relative">
        {/* Image Skeleton */}
        <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
          <Skeleton className="h-full w-full" />
        </div>

        {/* Discount Badge Skeleton */}
        <div className="absolute top-2 right-2">
          <Skeleton className="h-7 w-14 rounded-full" />
        </div>

        {/* Store Badge Skeleton */}
        <div className="absolute top-2 left-2">
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Title Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Price Section Skeleton */}
        <div className="space-y-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-28" />
        </div>

        {/* Coupon Section Skeleton (50% chance to show) */}
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-3 space-y-2">
          <Skeleton className="h-4 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="flex-1 h-10 rounded" />
            <Skeleton className="h-10 w-10 rounded" />
          </div>
        </div>

        {/* Action Button Skeleton */}
        <Skeleton className="h-11 w-full rounded-md" />

        {/* Timestamp Skeleton */}
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  );
}

export function ProductSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  );
}
