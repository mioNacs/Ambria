"use client";

import { cn } from "@/lib/utils";
import { parseGitHubUrl } from "@/lib/github";
import { pickSafeDomProps } from "@/components/tambo/shared/safe-dom-props";
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

const pullRequestFilesApiResponseSchema = z.object({
  files: z.array(pullRequestFileSchema),
});

const pullRequestFilesRequestSchema = z
  .object({
    repository: z
      .string()
      .optional()
      .describe(
        "Optional repository identifier (owner/repo or URL). If provided, owner/repo can be omitted.",
      ),
    owner: z
      .string()
      .optional()
      .describe("GitHub repository owner/organization name"),
    repo: z.string().optional().describe("GitHub repository name"),
    pullNumber: z.coerce.number().int().positive().describe("Pull request number"),
    limit: z
      .coerce
      .number()
      .int()
      .positive()
      .max(50)
      .optional()
      .describe("Number of files to fetch per page (default 20, max 50)"),
    page: z
      .coerce
      .number()
      .int()
      .positive()
      .max(100)
      .optional()
      .describe("Page number (1-indexed)"),
  })
  .describe(
    "A pull request files request. Prefer passing this instead of a large files array.",
  );

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function resolveOwnerRepo(input: {
  repository?: string;
  owner?: string;
  repo?: string;
}): { owner: string; repo: string } | null {
  const owner = normalizeOptionalString(input.owner);
  const repo = normalizeOptionalString(input.repo);

  if (owner && repo) return { owner, repo };

  const candidate =
    normalizeOptionalString(input.repository) ?? normalizeOptionalString(input.repo);

  if (!candidate) return null;
  if (!candidate.includes("/") && !candidate.includes("github.com")) {
    return null;
  }
  const parsed = parseGitHubUrl(candidate);
  if (!parsed) return null;
  const parsedOwner = normalizeOptionalString(parsed.owner);
  const parsedRepo = normalizeOptionalString(parsed.repo);
  return parsedOwner && parsedRepo ? { owner: parsedOwner, repo: parsedRepo } : null;
}

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
      .optional()
      .default([])
      .describe(
        "Files to display. If non-empty, filesRequest will be ignored.",
      ),
    filesRequest: pullRequestFilesRequestSchema
      .optional()
      .describe(
        "Optional pull request files request. When provided and files are omitted, the component will fetch files itself.",
      ),
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
> & React.HTMLAttributes<HTMLDivElement>;

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
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "removed":
      return "bg-destructive/10 text-destructive";
    case "renamed":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
    case "modified":
      return "bg-muted/40 text-muted-foreground";
    default:
      return "bg-muted/40 text-muted-foreground";
  }
}

export function GitHubPullRequestFiles({
  title = "Changed files",
  repoUrl,
  ref,
  files: filesProp,
  filesRequest,
  emptyMessage = "No changed files.",
  showPatchPreview,
  className,
  ...props
}: GitHubPullRequestFilesProps) {
  const [items, setItems] = React.useState(() => filesProp ?? []);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(filesRequest?.page ?? 1);
  const [hasMore, setHasMore] = React.useState(false);

  const filesPropLength = filesProp?.length ?? 0;
  const hasRequest = Boolean(filesRequest);

  const repository = filesRequest?.repository;
  const owner = filesRequest?.owner;
  const repo = filesRequest?.repo;
  const pullNumber = filesRequest?.pullNumber;
  const limit = filesRequest?.limit;
  const page = filesRequest?.page;

  const resolvedOwnerRepo = React.useMemo(() => {
    if (!hasRequest) return null;
    return resolveOwnerRepo({
      repository,
      owner,
      repo,
    });
  }, [hasRequest, owner, repo, repository]);

  const requestError = React.useMemo(() => {
    if (!hasRequest) return null;

    if (!resolvedOwnerRepo) {
      return "Invalid request (missing repository). Provide owner+repo or a repository identifier (owner/repo or URL).";
    }

    if (typeof pullNumber !== "number" || !Number.isFinite(pullNumber)) {
      return "Invalid request (missing or invalid pull request number).";
    }

    return null;
  }, [hasRequest, pullNumber, resolvedOwnerRepo]);

  const normalizedRequest = React.useMemo(() => {
    if (!hasRequest) return null;

    if (requestError) return null;
    if (!resolvedOwnerRepo) return null;
    if (typeof pullNumber !== "number") return null;

    return {
      owner: resolvedOwnerRepo.owner,
      repo: resolvedOwnerRepo.repo,
      pullNumber: Math.trunc(pullNumber),
      limit,
      page,
    };
  }, [
    hasRequest,
    limit,
    page,
    pullNumber,
    requestError,
    resolvedOwnerRepo,
  ]);

  const pageSize = React.useMemo(() => {
    const limit = normalizedRequest?.limit;
    if (!limit) return 20;
    return Math.max(1, Math.min(limit, 50));
  }, [normalizedRequest?.limit]);

  const requestIdRef = React.useRef(0);
  const abortRef = React.useRef<AbortController | null>(null);

  const cancelInFlight = React.useCallback(() => {
    requestIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const fetchPage = React.useCallback(
    async ({ page, mode }: { page: number; mode: "replace" | "append" }) => {
      if (!normalizedRequest) return;

      const requestId = ++requestIdRef.current;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/github/pull-request-files", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            ...normalizedRequest,
            includePatch: Boolean(showPatchPreview),
            limit: pageSize,
            page,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | {
                error?: string;
                details?: {
                  fieldErrors?: Record<string, string[] | undefined>;
                  formErrors?: string[];
                };
              }
            | null;

          const formErrors = payload?.details?.formErrors ?? [];
          const fieldErrors = payload?.details?.fieldErrors ?? {};

          const fieldErrorMessages = Object.entries(fieldErrors).flatMap(
            ([field, errors]) =>
              Array.isArray(errors)
                ? errors.map((error) => `${field}: ${error}`)
                : [],
          );
          const detailsMessage = [...formErrors, ...fieldErrorMessages]
            .filter(Boolean)
            .join("; ");

          const statusMessage =
            !detailsMessage && !payload?.error
              ? `Request failed (${response.status}). The server did not provide additional error details.`
              : undefined;

          throw new Error(
            detailsMessage ||
              payload?.error ||
              statusMessage ||
              `Request failed (${response.status})`,
          );
        }

        const payload = (await response.json().catch(() => null)) as unknown;
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
          throw new Error("Received an invalid response from the server");
        }
        const parsed = pullRequestFilesApiResponseSchema.safeParse(payload);
        if (!parsed.success) {
          throw new Error("Received an invalid response from the server");
        }

        const next = parsed.data.files;

        if (requestId !== requestIdRef.current) return;

        setItems((prev) => (mode === "append" ? [...prev, ...next] : next));
        setCurrentPage(page);
        setHasMore(next.length > 0 && next.length === pageSize && page < 100);
      } catch (e) {
        if (controller.signal.aborted) return;

        if (requestId !== requestIdRef.current) return;

        const message = e instanceof Error ? e.message : String(e);
        setError(message);
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [normalizedRequest, pageSize, showPatchPreview],
  );

  const normalizedRepoUrl = React.useMemo(() => {
    if (!repoUrl) return undefined;
    return repoUrl.replace(/\/+$/, "");
  }, [repoUrl]);

  React.useEffect(() => {
    // Precedence: explicit files props override filesRequest (no client-side pagination).
    if (filesPropLength > 0) {
      cancelInFlight();
      setItems(filesProp ?? []);
      setError(null);
      setIsLoading(false);
      setHasMore(false);
      setCurrentPage(1);
      return;
    }

    if (!hasRequest) {
      cancelInFlight();
      setItems([]);
      setError(null);
      setHasMore(false);
      setIsLoading(false);
      return;
    }

    if (requestError) {
      cancelInFlight();
      setItems([]);
      setError(requestError);
      setHasMore(false);
      setIsLoading(false);
      return;
    }

    if (!normalizedRequest) {
      cancelInFlight();
      setItems([]);
      setError("Invalid request.");
      setHasMore(false);
      setIsLoading(false);
      return;
    }

    cancelInFlight();
    const startPage = normalizedRequest.page ?? 1;
    setItems([]);
    setHasMore(false);
    setCurrentPage(startPage);
    void fetchPage({ page: startPage, mode: "replace" });
  }, [
    cancelInFlight,
    fetchPage,
    filesProp,
    filesPropLength,
    hasRequest,
    normalizedRequest,
    requestError,
  ]);

  React.useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const grouped = React.useMemo(() => {
    const groups = new Map<string, z.infer<typeof pullRequestFileSchema>[]>();
    for (const file of items ?? []) {
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
  }, [items]);

  return (
    <div
      className={cn(
        "w-full rounded-xl overflow-hidden bg-gradient-to-br from-indigo-500/5 via-card to-violet-500/5",
        "border border-indigo-500/50",
        "shadow-sm shadow-indigo-500/5 dark:shadow-indigo-500/10",
        className,
      )}
      {...pickSafeDomProps(props)}
    >
      <div className="flex items-baseline justify-between gap-4 p-4 border-b border-indigo-500/20 bg-indigo-500/5">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          {title}
          <span className="text-xs font-normal text-muted-foreground bg-background/50 px-2 py-0.5 rounded-full border border-indigo-500/10">
            {items.length.toLocaleString("en-US")} files
          </span>
        </h3>
      </div>

      {grouped.length === 0 ? (
        <div className="p-8 flex flex-col items-center justify-center text-center">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2">
               <div className="size-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
               <p className="text-sm text-indigo-600/80">Loading changed files…</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          )}
          {error ? <p className="text-sm text-destructive mt-2 bg-destructive/10 px-3 py-1 rounded-md">{error}</p> : null}
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {error ? <p className="text-sm text-destructive bg-destructive/10 px-3 py-1 rounded-md">{error}</p> : null}
          {grouped.map(([folder, groupFiles]) => (
            <div key={folder} className="rounded-lg border border-indigo-500/20 bg-background/40 overflow-hidden">
              <div className="flex items-center gap-2 border-b border-indigo-500/10 bg-indigo-500/5 px-3 py-2">
                <FileDiff className="size-4 text-indigo-500/70" />
                <div className="truncate font-mono text-xs font-medium text-foreground/80">
                  {folder}
                </div>
                <div className="ml-auto text-xs text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded-md">
                  {groupFiles.length.toLocaleString("en-US")}
                </div>
              </div>

              <div className="divide-y divide-indigo-500/10">
                {groupFiles.map((file) => {
                  const link =
                    file.htmlUrl ??
                    (normalizedRepoUrl && ref
                      ? `${normalizedRepoUrl}/blob/${ref}/${file.filename}`
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
                      className="px-3 py-2 hover:bg-indigo-500/5 transition-colors"
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
                                  "rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wider font-medium border",
                                  getStatusTone(statusText),
                                  statusText === 'added' && "border-emerald-500/20",
                                  statusText === 'removed' && "border-red-500/20",
                                  statusText === 'modified' && "border-border",
                                )}
                              >
                                {statusText}
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-1 space-y-0.5 pl-6">
                            <div className="truncate font-mono text-xs text-muted-foreground/80">
                              {file.filename}
                            </div>
                            {file.previousFilename ? (
                              <div className="truncate font-mono text-xs text-muted-foreground">
                                from: {file.previousFilename}
                              </div>
                            ) : null}
                            {statsText ? (
                              <div className="text-xs text-muted-foreground flex gap-2">
                                {typeof file.additions === "number" && <span className="text-emerald-600 dark:text-emerald-400">+{file.additions}</span>}
                                {typeof file.deletions === "number" && <span className="text-red-600 dark:text-red-400">-{file.deletions}</span>}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {link ? (
                          <a
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            className={cn(
                              "inline-flex shrink-0 items-center justify-center size-7 rounded-md",
                              "border border-indigo-500/20 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400",
                              "hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20",
                            )}
                          >
                            <ExternalLink className="size-3.5" />
                          </a>
                        ) : null}
                      </div>

                      {showPatchPreview && file.patch ? (
                        <details className="mt-2 pl-6">
                          <summary className="cursor-pointer text-xs text-indigo-500 hover:text-indigo-600 font-medium select-none">
                            Show diff preview
                          </summary>
                          <div className="mt-2 text-xs font-mono max-h-96 overflow-auto rounded-lg border border-indigo-500/20 bg-background/50 scrollbar-thin scrollbar-thumb-indigo-500/10 scrollbar-track-transparent">
                            <table className="w-full border-collapse">
                              <tbody>
                                {(() => {
                                  const lines = file.patch.split('\n');
                                  let oldLn = 0;
                                  let newLn = 0;
                                  
                                  return lines.map((line, i) => {
                                    // Skip empty last line or very short lines if needed, keeping basic check
                                    if (i === lines.length - 1 && !line) return null;

                                    let oldNum: number | string = "";
                                    let newNum: number | string = "";
                                    let type: 'add' | 'del' | 'hunk' | 'context' | 'meta' = 'context';
                                    
                                    // Check line type
                                    if (line.startsWith("@@")) {
                                      type = 'hunk';
                                      // Parse @@ -old,count +new,count @@
                                      const match = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
                                      if (match) {
                                        oldLn = parseInt(match[1]) - 1; 
                                        newLn = parseInt(match[2]) - 1;
                                      }
                                      oldNum = "...";
                                      newNum = "...";
                                    } else if (line.startsWith("+")) {
                                      type = 'add';
                                      newLn++;
                                      newNum = newLn;
                                    } else if (line.startsWith("-")) {
                                      type = 'del';
                                      oldLn++;
                                      oldNum = oldLn;
                                    } else if (line.startsWith(" ")) {
                                      type = 'context';
                                      oldLn++;
                                      newLn++;
                                      oldNum = oldLn;
                                      newNum = newLn;
                                    } else {
                                      type = 'meta'; // e.g. "No newline at end of file"
                                    }

                                    // Determine row styling
                                    let rowClass = "group/line transition-colors hover:bg-muted/50";
                                    if (type === 'add') {
                                      rowClass = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-l-[3px] border-emerald-500/40";
                                    } else if (type === 'del') {
                                      rowClass = "bg-red-500/10 text-red-700 dark:text-red-400 border-l-[3px] border-red-500/40";
                                    } else if (type === 'hunk') {
                                      rowClass = "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 font-semibold border-l-[3px] border-indigo-500/40 divide-y divide-indigo-500/20";
                                    } else {
                                      rowClass = "text-muted-foreground/80 border-l-[3px] border-transparent";
                                    }

                                    return (
                                      <tr key={i} className={rowClass}>
                                        <td className="w-10 select-none text-right pr-3 py-0.5 text-[10px] text-muted-foreground/40 border-r border-indigo-500/10 font-mono tracking-tighter align-top whitespace-nowrap">
                                          {oldNum}
                                        </td>
                                        <td className="w-10 select-none text-right pr-3 py-0.5 text-[10px] text-muted-foreground/40 border-r border-indigo-500/10 font-mono tracking-tighter align-top whitespace-nowrap">
                                          {newNum}
                                        </td>
                                        <td className="pl-3 py-0.5 whitespace-pre break-all align-top font-mono text-xs">
                                          {line}
                                        </td>
                                      </tr>
                                    );
                                  });
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </details>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {hasRequest && hasMore ? (
            <button
              type="button"
              onClick={() => {
                if (isLoading) return;
                if (currentPage >= 100) return;
                void fetchPage({ page: currentPage + 1, mode: "append" });
              }}
              className={cn(
                "w-full rounded-xl border border-indigo-500/20 bg-indigo-500/5",
                "px-4 py-3 text-sm font-medium text-indigo-600 dark:text-indigo-400",
                "hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all",
                "disabled:opacity-60 disabled:cursor-not-allowed",
                "flex items-center justify-center gap-2"
              )}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="size-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Loading…
                </>
              ) : "Load more files"}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
