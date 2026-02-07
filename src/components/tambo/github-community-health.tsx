"use client";

import { cn } from "@/lib/utils";
import { chatRenderableStyles } from "@/components/tambo/shared/chat-renderable-styles";
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
        chatRenderableStyles.card,
        className,
      )}
      {...pickSafeDomProps(props)}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h3 className={cn(chatRenderableStyles.title, "mt-0 text-base")}>{title}</h3>
        <div className={chatRenderableStyles.kicker}>
          <span className="font-medium text-foreground">{presentCount}</span> present
          {missingCount > 0 ? `, ${missingCount} missing` : null}
        </div>
      </div>

      {uniqueFiles.length === 0 ? (
        <div className={cn(chatRenderableStyles.emptyState, "mt-3")}>No results.</div>
      ) : (
        <div className="mt-3 space-y-2">
          {uniqueFiles.map((file) => {
            const name = file.name ?? file.path;
            const path = file.path;

            return (
              <div
                key={path}
                className={cn(
                  chatRenderableStyles.subcard,
                  "py-2",
                  file.exists
                    ? "bg-emerald-500/5 dark:bg-emerald-500/10"
                    : "bg-destructive/5 dark:bg-destructive/10",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {file.exists ? (
                      <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle className="size-4 text-destructive dark:text-red-400" />
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">
                        {name}
                      </div>
                      {path ? (
                        <div className="truncate font-mono text-xs text-muted-foreground">
                          {path}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "text-xs font-medium",
                      file.exists
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-destructive",
                    )}
                  >
                    {file.exists ? "Present" : "Missing"}
                  </div>
                </div>

                {file.content ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-muted-foreground">
                      Preview
                    </summary>
                    <pre className="mt-2 max-h-56 overflow-auto rounded-xl border border-border/60 bg-background p-2 text-xs text-foreground">
                      {file.content}
                    </pre>
                  </details>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
