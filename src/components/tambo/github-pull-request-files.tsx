"use client";

import { cn } from "@/lib/utils";
import { ExternalLink, FileDiff, FileText } from "lucide-react";
import * as React from "react";
import { z } from "zod";

const pullRequestFileSchema = z
  .object({
    filename: z.string().describe("File path within the repository"),
    status: z
      .string()
      .optional()
      .describe("File status (added, modified, removed, renamed, etc.)"),
    additions: z.number().optional().describe("Number of added lines"),
    deletions: z.number().optional().describe("Number of removed lines"),
    changes: z.number().optional().describe("Total changed lines"),
    patch: z
      .string()
      .optional()
      .describe("Optional diff patch snippet (may be truncated)"),
    previousFilename: z
      .string()
      .optional()
      .describe("Previous filename when the file was renamed"),
    htmlUrl: z
      .string()
      .optional()
      .describe("Optional link to open the file on GitHub"),
  })
  .describe("A file changed in a GitHub pull request");

export const githubPullRequestFilesSchema = z
  .object({
    title: z
      .string()
      .optional()
      .describe("Title displayed above the changed files list"),
    repoUrl: z
      .string()
      .optional()
      .describe(
        "Optional base GitHub repo URL (e.g., 'https://github.com/owner/repo'), used to build file links when htmlUrl isn't provided.",
      ),
    ref: z
      .string()
      .optional()
      .describe(
        "Optional ref (branch, tag, or commit SHA) used with repoUrl to build file links.",
      ),
    files: z
      .array(pullRequestFileSchema)
      .default([])
      .describe("Files changed in the pull request"),
    emptyMessage: z
      .string()
      .optional()
      .describe("Message shown when there are no changed files"),
    showPatchPreview: z
      .boolean()
      .optional()
      .describe("Whether to show a collapsible diff preview when available"),
  })
  .describe(
    "Shows a pull request's changed files grouped by folder path with basic change stats.",
  );

export type GitHubPullRequestFilesProps = z.infer<
  typeof githubPullRequestFilesSchema
> & {
  className?: string;
};

function getFolderLabel(path: string) {
  const parts = path.split("/").filter(Boolean);
  if (parts.length <= 1) return "(root)";
  return parts.slice(0, -1).join("/");
}

function getBasename(path: string) {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

function getStatusTone(status?: string) {
  const normalized = status?.toLowerCase();
  switch (normalized) {
    case "added":
      return "bg-emerald-500/10 text-emerald-700";
    case "removed":
      return "bg-destructive/10 text-destructive";
    case "renamed":
      return "bg-blue-500/10 text-blue-700";
    case "modified":
      return "bg-muted/30 text-muted-foreground";
    default:
      return "bg-muted/30 text-muted-foreground";
  }
}

export function GitHubPullRequestFiles({
  title = "Changed files",
  repoUrl,
  ref,
  files,
  emptyMessage = "No changed files.",
  showPatchPreview,
  className,
}: GitHubPullRequestFilesProps) {
  const grouped = React.useMemo(() => {
    const groups = new Map<string, z.infer<typeof pullRequestFileSchema>[]>();
    for (const file of files ?? []) {
      if (!file?.filename) continue;
      const folder = getFolderLabel(file.filename);
      const existing = groups.get(folder);
      if (existing) {
        existing.push(file);
      } else {
        groups.set(folder, [file]);
      }
    }

    const result = Array.from(groups.entries()).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    for (const [, groupFiles] of result) {
      groupFiles.sort((a, b) => a.filename.localeCompare(b.filename));
    }
    return result;
  }, [files]);

  return (
    <div
      className={cn(
        "w-full rounded-lg border border-border bg-background",
        "p-4",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <div className="text-xs text-muted-foreground">
          {(files?.length ?? 0).toLocaleString("en-US")} files
        </div>
      </div>

      {grouped.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="mt-3 space-y-4">
          {grouped.map(([folder, groupFiles]) => (
            <div key={folder} className="rounded-md border border-border">
              <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-3 py-2">
                <FileDiff className="size-4 text-muted-foreground" />
                <div className="truncate font-mono text-xs text-muted-foreground">
                  {folder}
                </div>
                <div className="ml-auto text-xs text-muted-foreground">
                  {groupFiles.length.toLocaleString("en-US")}
                </div>
              </div>

              <div className="divide-y divide-border">
                {groupFiles.map((file) => {
                  const link =
                    file.htmlUrl ??
                    (repoUrl && ref
                      ? `${repoUrl}/blob/${ref}/${file.filename}`
                      : undefined);

                  const statsParts: string[] = [];
                  if (typeof file.additions === "number") {
                    statsParts.push(`+${file.additions.toLocaleString("en-US")}`);
                  }
                  if (typeof file.deletions === "number") {
                    statsParts.push(`-${file.deletions.toLocaleString("en-US")}`);
                  }
                  if (typeof file.changes === "number") {
                    statsParts.push(
                      `${file.changes.toLocaleString("en-US")} lines`,
                    );
                  }
                  const statsText = statsParts.join(" • ");
                  const statusText = file.status?.toLowerCase();

                  return (
                    <div
                      key={file.previousFilename
                        ? `${file.previousFilename}->${file.filename}`
                        : file.filename}
                      className="px-3 py-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText className="size-4 text-muted-foreground" />
                            <div className="truncate text-sm font-medium text-foreground">
                              {getBasename(file.filename)}
                            </div>
                            {statusText ? (
                              <span
                                className={cn(
                                  "rounded-md px-2 py-0.5 text-xs font-medium",
                                  getStatusTone(statusText),
                                )}
                              >
                                {statusText}
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-1 space-y-0.5">
                            <div className="truncate font-mono text-xs text-muted-foreground">
                              {file.filename}
                            </div>
                            {file.previousFilename ? (
                              <div className="truncate font-mono text-xs text-muted-foreground">
                                from: {file.previousFilename}
                              </div>
                            ) : null}
                            {statsText ? (
                              <div className="text-xs text-muted-foreground">
                                {statsText}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {link ? (
                          <a
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-muted/30 px-2 py-1 text-xs text-foreground hover:bg-muted/40"
                          >
                            Open <ExternalLink className="size-3.5" />
                          </a>
                        ) : null}
                      </div>

                      {showPatchPreview && file.patch ? (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-muted-foreground">
                            Diff preview
                          </summary>
                          <pre className="mt-2 max-h-80 overflow-auto rounded bg-background p-2 font-mono text-xs text-foreground">
                            {file.patch}
                          </pre>
                        </details>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
