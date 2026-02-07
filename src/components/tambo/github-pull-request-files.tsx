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
    normalizeOptionalString(input.repository) ??
    normalizeOptionalString(input.repo) ??
    normalizeOptionalString(input.owner);

  if (!candidate) return null;
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

  const normalizedRequest = React.useMemo(() => {
    if (!hasRequest) return null;

    const ownerRepo = resolveOwnerRepo({
      repository,
      owner,
      repo,
    });

    if (!ownerRepo) return null;

    if (typeof pullNumber !== "number" || !Number.isFinite(pullNumber)) {
      return null;
    }

    return {
      owner: ownerRepo.owner,
      repo: ownerRepo.repo,
      pullNumber: Math.trunc(pullNumber),
      limit,
      page,
    };
  }, [hasRequest, limit, owner, page, pullNumber, repo, repository]);

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
        setHasMore(next.length > 0 && next.length === pageSize);
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

    if (!normalizedRequest) {
      cancelInFlight();
      setItems([]);
      setError(
        "Invalid request (missing repository). Provide owner+repo or a repository URL.",
      );
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
        "w-full rounded-xl border border-muted-foreground/20 bg-card",
        "p-4",
        "shadow-sm shadow-black/5 dark:shadow-black/30",
        className,
      )}
      {...pickSafeDomProps(props)}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <div className="text-xs text-muted-foreground">
          {items.length.toLocaleString("en-US")} files
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="mt-3 space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          )}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {grouped.map(([folder, groupFiles]) => (
            <div key={folder} className="rounded-lg border border-muted-foreground/20 bg-muted/10">
              <div className="flex items-center gap-2 border-b border-muted-foreground/20 bg-muted/30 px-3 py-2">
                <FileDiff className="size-4 text-muted-foreground" />
                <div className="truncate font-mono text-xs text-muted-foreground">
                  {folder}
                </div>
                <div className="ml-auto text-xs text-muted-foreground">
                  {groupFiles.length.toLocaleString("en-US")}
                </div>
              </div>

              <div className="divide-y divide-muted-foreground/20">
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
                            className={cn(
                              "inline-flex shrink-0 items-center gap-1 rounded-md",
                              "border border-muted-foreground/20 bg-muted/40",
                              "px-2 py-1 text-xs text-foreground",
                              "hover:bg-muted/60 transition-colors",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                            )}
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
                          <pre className="mt-2 max-h-80 overflow-auto rounded-md border border-muted-foreground/20 bg-background p-2 font-mono text-xs text-foreground">
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

          {hasRequest && hasMore ? (
            <button
              type="button"
              onClick={() => {
                if (isLoading) return;
                void fetchPage({ page: currentPage + 1, mode: "append" });
              }}
              className={cn(
                "w-full rounded-md border border-muted-foreground/20 bg-muted/30",
                "px-3 py-2 text-sm text-foreground",
                "hover:bg-muted/50 transition-colors",
                "disabled:opacity-60",
              )}
              disabled={isLoading}
            >
              {isLoading ? "Loading…" : "Load more"}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
