"use client";

import { cn } from "@/lib/utils";
import { pickSafeDomProps } from "@/components/tambo/shared/safe-dom-props";
import { CheckCircle2, XCircle } from "lucide-react";
import * as React from "react";
import { z } from "zod";

const communityFileSchema = z
  .object({
    name: z.string().optional().describe("Display name of the community file"),
    path: z.string().describe("Repository path to the file"),
    exists: z.boolean().describe("Whether the file exists in the repository"),
    content: z
      .string()
      .optional()
      .describe("Optional preview snippet of the file contents"),
  });

export const communityHealthSchema = z
  .object({
    title: z
      .string()
      .optional()
      .describe("Title shown above the community health checklist"),
    files: z
      .array(communityFileSchema)
      .describe(
        "Array of community files and whether they exist (e.g., CONTRIBUTING.md, SECURITY.md)",
      ),
  })
  .describe(
    "Shows a repository community health checklist (CODE_OF_CONDUCT, CONTRIBUTING, SECURITY, etc.)",
  );

export type CommunityHealthProps = z.infer<typeof communityHealthSchema> &
  React.HTMLAttributes<HTMLDivElement>;

export function CommunityHealth({
  title = "Community health",
  files = [],
  className,
  ...props
}: CommunityHealthProps) {
  const uniqueFiles = React.useMemo(() => {
    const seen = new Set<string>();
    return files.filter((file) => {
      if (seen.has(file.path)) return false;
      seen.add(file.path);
      return true;
    });
  }, [files]);

  const presentCount = uniqueFiles.filter((f) => f.exists).length;
  const missingCount = uniqueFiles.filter((f) => f.exists === false).length;

  return (
    <div
      className={cn(
        "w-full rounded-xl overflow-hidden bg-gradient-to-br from-rose-500/5 via-card to-pink-500/5",
        "border border-rose-500/50",
        "shadow-sm shadow-rose-500/5 dark:shadow-rose-500/10",
        className,
      )}
      {...pickSafeDomProps(props)}
    >
      <div className="relative px-5 py-4 border-b border-rose-500/20 bg-muted/30 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Core community standards checklist
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end">
            <span className="text-xs font-medium text-foreground">
              {Math.round((presentCount / (uniqueFiles.length || 1)) * 100)}%
            </span>
            <span className="text-[10px] text-muted-foreground">Health Score</span>
          </div>
          <div className="w-8 h-8 rounded-full border-2 border-muted-foreground/10 flex items-center justify-center relative bg-card">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-muted-foreground/10"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className={cn(
                  "transition-all duration-1000 ease-out",
                  presentCount === uniqueFiles.length ? "text-emerald-500" : 
                  presentCount > uniqueFiles.length / 2 ? "text-amber-500" : "text-rose-500"
                )}
                strokeDasharray={`${(presentCount / (uniqueFiles.length || 1)) * 100}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
              />
            </svg>
          </div>
        </div>
      </div>

      {uniqueFiles.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm text-muted-foreground">No health files found.</p>
        </div>
      ) : (
        <div className="p-4 space-y-2.5">
          {uniqueFiles.map((file) => {
            const name = file.name ?? file.path;
            const path = file.path;

            return (
              <div
                key={path}
                className={cn(
                  "group relative overflow-hidden rounded-lg border px-3 py-2.5 transition-all",
                  file.exists
                    ? "bg-emerald-500/[0.03] border-emerald-500/20 hover:bg-emerald-500/[0.06] hover:border-emerald-500/30"
                    : "bg-destructive/[0.03] border-destructive/20 hover:bg-destructive/[0.06] hover:border-destructive/30",
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "mt-0.5 flex items-center justify-center size-5 rounded-full shrink-0",
                    file.exists ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive"
                  )}>
                    {file.exists ? (
                      <CheckCircle2 className="size-3.5" />
                    ) : (
                      <XCircle className="size-3.5" />
                    )}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-sm text-foreground">
                        {name}
                      </div>
                      <span className={cn(
                        "text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-sm",
                        file.exists ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-destructive/10 text-destructive"
                      )}>
                        {file.exists ? "Present" : "Missing"}
                      </span>
                    </div>
                    
                    {path && (
                      <div className="text-xs text-muted-foreground font-mono mt-0.5 truncate opacity-70">
                        {path}
                      </div>
                    )}

                    {file.content && (
                      <details className="mt-2 group/details">
                        <summary className="cursor-pointer text-[10px] font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1 select-none transition-colors">
                          <span className="group-open/details:hidden">Show Preview</span>
                          <span className="hidden group-open/details:inline">Hide Preview</span>
                        </summary>
                        <div className="mt-2 relative">
                          <pre className="max-h-40 overflow-auto rounded-md border border-muted-foreground/10 bg-background/80 p-2 text-[10px] text-muted-foreground font-mono leading-relaxed backdrop-blur-sm">
                            {file.content}
                          </pre>
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
