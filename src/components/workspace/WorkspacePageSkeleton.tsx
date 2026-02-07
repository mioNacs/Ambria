import * as React from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface WorkspacePageSkeletonProps {
  label?: string;
}

export function WorkspacePageSkeleton({
  label = "Loading workspace…",
}: WorkspacePageSkeletonProps) {
  return (
    <div
      className="h-screen bg-gray-50 flex flex-col overflow-hidden"
      aria-busy="true"
    >
      <span className="sr-only" role="status" aria-live="polite">
        {label}
      </span>

      <header className="bg-white/80 backdrop-blur border-b border-gray-200 px-4">
        <div className="mx-auto flex items-center justify-between h-16">
          <div className="flex items-center gap-4 min-w-0">
            <Skeleton className="h-9 w-9 rounded-lg" />

            <div className="hidden sm:flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-16 rounded-lg" />
                <Skeleton className="h-3 w-20 rounded-lg" />
              </div>
              <div className="h-8 w-px bg-gray-200 mx-1" />
            </div>

            <div className="flex items-center gap-3 min-w-0">
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-4 w-56 max-w-full rounded-lg" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3 w-20 rounded-lg" />
                  <Skeleton className="h-3 w-24 rounded-lg" />
                </div>
              </div>
            </div>
          </div>

          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </header>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Thread sidebar */}
        <aside className="w-72 flex flex-col bg-white/80 backdrop-blur border-r border-gray-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 rounded-lg" />
              <Skeleton className="h-3 w-20 rounded-lg" />
            </div>
            <Skeleton className="h-6 w-6 rounded-md" />
          </div>

          <div className="px-3 py-2">
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>

          <div className="px-3 pb-2">
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-xl",
                  i === 1 ? "bg-emerald-50" : "bg-transparent",
                )}
              >
                <Skeleton className="h-8 w-1 rounded-full" />
                <Skeleton className="h-4 w-44 max-w-full rounded-lg" />
              </div>
            ))}
          </div>

          <div className="px-4 py-3 border-t border-gray-200">
            <Skeleton className="h-3 w-48 max-w-full rounded-lg" />
          </div>
        </aside>

        {/* Main chat area */}
        <main className="flex-1 min-w-0 flex flex-col bg-background">
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto p-4 space-y-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}
                >
                  <div className="space-y-2 w-[70%]">
                    <Skeleton className="h-4 w-2/3 rounded-lg" />
                    <Skeleton className="h-4 w-full rounded-lg" />
                    <Skeleton className="h-4 w-4/5 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-4 pb-2">
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        </main>

        {/* Workspace canvases */}
        <section className="w-[30rem] flex flex-col bg-card border-l border-muted-foreground/20 shadow-sm">
          <div className="flex items-center justify-between border-b border-muted-foreground/20 pl-4 pr-2 py-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 rounded-lg" />
              <Skeleton className="h-3 w-32 rounded-lg" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
          </div>

          <div className="flex-1 min-h-0 p-4 space-y-3">
            <Skeleton className="h-4 w-24 rounded-lg" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </section>
      </div>
    </div>
  );
}
