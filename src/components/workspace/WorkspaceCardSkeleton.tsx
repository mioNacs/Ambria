import * as React from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type WorkspaceCardSkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function WorkspaceCardSkeleton({
  className,
  ...props
}: WorkspaceCardSkeletonProps) {
  return (
    <div
      className={cn(
        "relative bg-white rounded-2xl border border-gray-200 overflow-hidden",
        className,
      )}
      {...props}
    >
      <Skeleton className="h-1.5 w-full rounded-none" />

      <div className="p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-2/3 rounded-lg" />
            <Skeleton className="h-4 w-1/3 rounded-lg" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-3 w-full rounded-lg" />
            <Skeleton className="h-3 w-4/5 rounded-lg" />
          </div>

          <Skeleton className="h-7 w-24 rounded-full" />

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex gap-4">
              <Skeleton className="h-4 w-12 rounded-lg" />
              <Skeleton className="h-4 w-16 rounded-lg" />
            </div>
            <Skeleton className="h-4 w-12 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
