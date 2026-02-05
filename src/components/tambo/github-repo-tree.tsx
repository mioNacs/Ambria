"use client";

import { cn } from "@/lib/utils";
import { useTamboComponentState } from "@tambo-ai/react";
import { FileText, Folder, Scissors } from "lucide-react";
import * as React from "react";
import { z } from "zod";

const repoTreeItemSchema = z
  .object({
    path: z.string().describe("Full path for the tree item"),
    type: z
      .enum(["file", "dir"])
      .describe("Whether the item is a file or directory"),
    size: z.number().optional().describe("Optional file size in bytes"),
  });

export const githubRepoTreeSchema = z
  .object({
    title: z
      .string()
      .optional()
      .describe("Title displayed above the repository tree"),
    tree: z.array(repoTreeItemSchema).describe("Repository tree items"),
    truncated: z
      .boolean()
      .optional()
      .describe(
        "Whether results were truncated due to size limits (true means not all files are shown)",
      ),
    initialSelectedPath: z
      .string()
      .optional()
      .describe("Optional initial selected file path"),
  })
  .describe(
    "Shows a GitHub repository file tree. Users can click to select a file path.",
  );

type RepoTreeItem = z.infer<typeof repoTreeItemSchema>;

type RepoTreeState = {
  selectedPath: string | null;
};

export type GitHubRepoTreeProps = z.infer<typeof githubRepoTreeSchema> &
  React.HTMLAttributes<HTMLDivElement>;

function getRowLabel(path?: string) {
  if (!path) return "(unknown)";
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

function sortTree(items: RepoTreeItem[]) {
  return [...items].sort((a, b) => {
    const aType = a.type ?? "file";
    const bType = b.type ?? "file";
    if (aType !== bType) return aType === "dir" ? -1 : 1;
    const aPath = a.path ?? "";
    const bPath = b.path ?? "";
    return aPath.localeCompare(bPath);
  });
}

export function GitHubRepoTree({
  title = "Repository tree",
  tree = [],
  truncated,
  initialSelectedPath,
  className,
  ...props
}: GitHubRepoTreeProps) {
  const instanceId = React.useId();
  const [state, setState] = useTamboComponentState<RepoTreeState>(
    `github-repo-tree:${instanceId}`,
    { selectedPath: initialSelectedPath ?? null },
  );

  React.useEffect(() => {
    if (!initialSelectedPath) return;
    if (state?.selectedPath) return;
    setState({ selectedPath: initialSelectedPath });
  }, [initialSelectedPath, setState, state?.selectedPath]);

  const items = React.useMemo(() => sortTree(tree), [tree]);
  const selectedPath = state?.selectedPath ?? null;

  return (
    <div
      className={cn(
        "w-full rounded-lg border border-border bg-background",
        "p-4",
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-foreground">
            {title}
          </h3>
          {selectedPath ? (
            <div className="mt-1 truncate font-mono text-xs text-muted-foreground">
              Selected: {selectedPath}
            </div>
          ) : null}
        </div>

        {truncated ? (
          <div className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
            <Scissors className="size-3.5" /> Truncated
          </div>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No files.</p>
      ) : (
        <div className="mt-3 max-h-96 overflow-auto rounded-md border border-border">
          <div className="divide-y divide-border">
            {items.map((item, index) => {
              const path = item.path;
              const isSelected = path === selectedPath;
              const label = getRowLabel(path);

              const Icon = item.type === "dir" ? Folder : FileText;

              return (
                <button
                  key={`${path}-${index}`}
                  type="button"
                  onClick={() => setState({ selectedPath: path })}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left",
                    "hover:bg-muted/40 transition-colors",
                    isSelected && "bg-muted/60",
                  )}
                >
                  <Icon className="size-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">
                      {label}
                    </div>
                    <div className="truncate font-mono text-xs text-muted-foreground">
                      {path}
                    </div>
                  </div>
                  {typeof item.size === "number" ? (
                    <div className="shrink-0 font-mono text-xs text-muted-foreground">
                      {item.size.toLocaleString("en-US")}B
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
