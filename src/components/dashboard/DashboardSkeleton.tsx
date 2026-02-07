import * as React from "react";

import { WorkspaceCardSkeleton } from "@/components/workspace/WorkspaceCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export interface DashboardSkeletonProps {
  label?: string;
}

export function DashboardSkeleton({
  label = "Loading dashboard…",
}: DashboardSkeletonProps) {
  return (
    <div className="min-h-screen bg-gray-50" aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">
        {label}
      </span>

      <header className="bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24 rounded-lg" />
                <Skeleton className="h-3 w-40 rounded-lg" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-xl hidden sm:block" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-start sm:items-center justify-between gap-4 mb-8">
          <div className="space-y-3">
            <Skeleton className="h-8 w-44 rounded-xl" />
            <Skeleton className="h-4 w-[28rem] max-w-full rounded-lg" />
          </div>

          <Skeleton className="h-11 w-40 rounded-xl hidden sm:block" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <WorkspaceCardSkeleton key={i} />
          ))}
        </div>
      </main>
    </div>
  );
}
