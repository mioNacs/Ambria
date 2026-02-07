import * as React from "react";

import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shimmer?: boolean;
}

export function Skeleton({ className, shimmer = true, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-md",
        shimmer
          ? "bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-white/10 dark:via-white/20 dark:to-white/10 [background-size:200%_100%] animate-[shimmer_2s_ease-in-out_infinite] motion-reduce:animate-none"
          : "bg-gray-200/70 dark:bg-white/10 animate-pulse motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}
