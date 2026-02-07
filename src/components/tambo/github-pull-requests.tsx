"use client";

import { cn } from "@/lib/utils";
import { parseGitHubUrl } from "@/lib/github";
import { pickSafeDomProps } from "@/components/tambo/shared/safe-dom-props";
import { ExternalLink, GitBranch, GitMerge } from "lucide-react";
import * as React from "react";
import { z } from "zod";

export const githubPullRequestSchema = z
  .object({
    number: z.number().describe("Pull request number"),
    title: z.string().describe("Pull request title"),
    state: z
      .enum(["open", "closed"])
      .optional()
      .describe("PR state (open/closed)"),
    author: z.string().optional().describe("PR author username"),
    labels: z
      .array(z.string())
      .default([])
      .describe("Label names applied to the pull request"),
    createdAt: z
      .string()
      .optional()
      .describe("PR creation time as ISO string"),
    updatedAt: z
      .string()
      .optional()
      .describe("PR last update time as ISO string"),
    closedAt: z
      .string()
      .nullable()
      .optional()
      .describe("PR closed time as ISO string"),
    mergedAt: z
      .string()
      .nullable()
      .optional()
      .describe("PR merged time as ISO string"),
    draft: z.boolean().optional().describe("Whether the PR is a draft"),
    htmlUrl: z.string().optional().describe("GitHub URL for the PR"),
    body: z
      .string()
      .nullable()
      .optional()
      .describe("Optional short preview of the PR description"),
    head: z
      .string()
      .optional()
      .describe("Head branch name (source)"),
    base: z
      .string()
      .optional()
      .describe("Base branch name (target)"),
  });

const pullRequestsApiResponseSchema = z.object({
  pullRequests: z.array(githubPullRequestSchema),
});

const pullRequestsRequestSchema = z
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
    state: z
      .enum(["open", "closed", "all"])
      .optional()
      .describe("Filter pull requests by state"),
    limit: z
      .coerce
      .number()
      .int()
      .positive()
      .max(50)
      .optional()
      .describe("Number of pull requests to fetch per page (default 20, max 50)"),
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
    "A GitHub pull requests request. Prefer passing this instead of a large pullRequests array.",
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

export const pullRequestCardSchema = githubPullRequestSchema
  .extend({
    showBodyPreview: z
      .boolean()
      .optional()
      .describe("Whether to show a short preview of the PR description"),
  })
  .describe(
    "Shows a GitHub pull request as a compact card (number, title, branches, labels, etc.)",
  );

export type PullRequestCardProps = z.infer<typeof pullRequestCardSchema> &
  React.HTMLAttributes<HTMLDivElement>;

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function LabelPill({ label }: { label: string }) {
  return (
    <span className="rounded-md border border-muted-foreground/20 bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
      {label}
    </span>
  );
}

export function PullRequestCard({
  number,
  title,
  state,
  author,
  labels,
  createdAt,
  updatedAt,
  closedAt,
  mergedAt,
  draft,
  htmlUrl,
  body,
  head,
  base,
  showBodyPreview,
  className,
  ...props
}: PullRequestCardProps) {
  const header = number ? `#${number}` : "Pull request";
  const created = formatDate(createdAt);
  const updated = formatDate(updatedAt);
  const closed = formatDate(closedAt);
  const merged = formatDate(mergedAt);
  const allLabels = (labels ?? []).filter(Boolean);
  const normalizedLabels = allLabels.slice(0, 8);
  const extraLabelsCount = allLabels.length - normalizedLabels.length;

  return (
    <div
      className={cn(
        "w-full rounded-xl border border-muted-foreground/20 bg-card p-4",
        "shadow-sm shadow-black/5 dark:shadow-black/30",
        className,
      )}
      {...pickSafeDomProps(props)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{header}</div>
          <div className="mt-1 truncate text-base font-semibold text-foreground">
            {title ?? "(no title)"}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {draft ? (
              <span className="rounded-md border border-muted-foreground/20 bg-muted/40 px-2 py-0.5 text-muted-foreground">
                Draft
              </span>
            ) : null}
            {state ? (
              <span className="rounded-md border border-muted-foreground/20 bg-muted/40 px-2 py-0.5 text-muted-foreground">
                {state}
              </span>
            ) : null}
            {author ? <span>by {author}</span> : null}
            {created ? <span>• opened {created}</span> : null}
            {updated ? <span>• updated {updated}</span> : null}
            {closed ? <span>• closed {closed}</span> : null}
            {merged ? (
              <span className="inline-flex items-center gap-1">
                • <GitMerge className="size-3.5" /> merged {merged}
              </span>
            ) : null}
          </div>

          {head || base ? (
            <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-muted-foreground/20 bg-muted/30 px-2 py-1 font-mono text-xs text-muted-foreground">
              <GitBranch className="size-3.5" />
              <span className="truncate">{head ?? "?"}</span>
              <span>→</span>
              <span className="truncate">{base ?? "?"}</span>
            </div>
          ) : null}
        </div>

        {htmlUrl ? (
          <a
            href={htmlUrl}
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

      {normalizedLabels.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {normalizedLabels.map((label) => (
            <LabelPill key={label} label={label} />
          ))}
          {extraLabelsCount > 0 ? (
            <span className="rounded-md border border-muted-foreground/20 bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
              +{extraLabelsCount} more
            </span>
          ) : null}
        </div>
      ) : null}

      {showBodyPreview && body ? (
        <p className="mt-3 line-clamp-4 text-sm text-muted-foreground">{body}</p>
      ) : null}
    </div>
  );
}

export const pullRequestListSchema = z
  .object({
    title: z
      .string()
      .optional()
      .describe("Title displayed above the pull request list"),
    pullRequests: z
      .array(githubPullRequestSchema)
      .optional()
      .default([])
      .describe(
        "Pull requests to display. If non-empty, pullRequestsRequest will be ignored.",
      ),
    pullRequestsRequest: pullRequestsRequestSchema
      .optional()
      .describe(
        "Optional pull requests request. When provided and pullRequests are omitted, the component will fetch pull requests itself.",
      ),
    showBodyPreview: z
      .boolean()
      .optional()
      .describe("Whether to show a body preview for each PR"),
    emptyMessage: z
      .string()
      .optional()
      .describe("Message shown when there are no pull requests"),
  })
  .describe("Shows a list of GitHub pull requests as cards");

export type PullRequestListProps = z.infer<typeof pullRequestListSchema> &
  React.HTMLAttributes<HTMLDivElement>;

export function PullRequestList({
  title = "Pull requests",
  pullRequests: pullRequestsProp,
  pullRequestsRequest,
  showBodyPreview,
  emptyMessage = "No pull requests.",
  className,
  ...props
}: PullRequestListProps) {
  const [items, setItems] = React.useState(() => pullRequestsProp ?? []);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(
    pullRequestsRequest?.page ?? 1,
  );
  const [hasMore, setHasMore] = React.useState(false);

  const pullRequestsPropLength = pullRequestsProp?.length ?? 0;
  const hasRequest = Boolean(pullRequestsRequest);

  const normalizedRequest = React.useMemo(() => {
    if (!pullRequestsRequest) return null;

    const ownerRepo = resolveOwnerRepo({
      repository: pullRequestsRequest.repository,
      owner: pullRequestsRequest.owner,
      repo: pullRequestsRequest.repo,
    });

    if (!ownerRepo) return null;

    return {
      owner: ownerRepo.owner,
      repo: ownerRepo.repo,
      state: pullRequestsRequest.state,
      limit: pullRequestsRequest.limit,
      page: pullRequestsRequest.page,
    };
  }, [
    pullRequestsRequest?.limit,
    pullRequestsRequest?.owner,
    pullRequestsRequest?.page,
    pullRequestsRequest?.repo,
    pullRequestsRequest?.repository,
    pullRequestsRequest?.state,
  ]);

  const pageSize = React.useMemo(() => {
    const normalizedLimit = normalizedRequest?.limit;
    if (!normalizedLimit) return 20;
    return Math.max(1, Math.min(normalizedLimit, 50));
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
        const response = await fetch("/api/github/pull-requests", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            ...normalizedRequest,
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
        const parsed = pullRequestsApiResponseSchema.safeParse(payload);
        if (!parsed.success) {
          throw new Error("Received an invalid response from the server");
        }

        const next = parsed.data.pullRequests;

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
    [normalizedRequest, pageSize],
  );

  React.useEffect(() => {
    // Precedence: explicit pullRequests props override pullRequestsRequest (no client-side pagination).
    if (pullRequestsPropLength > 0) {
      cancelInFlight();
      setItems(pullRequestsProp ?? []);
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
    hasRequest,
    normalizedRequest,
    pullRequestsProp,
    pullRequestsPropLength,
  ]);

  React.useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const bodyPreviewProps =
    typeof showBodyPreview === "boolean" ? { showBodyPreview } : undefined;

  return (
    <div className={cn("w-full", className)} {...pickSafeDomProps(props)}>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <div className="text-xs text-muted-foreground">
          {items.length.toLocaleString("en-US")} items
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-3 space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          )}
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
          {items.map((pr) => (
            <PullRequestCard
              key={pr.htmlUrl ?? `pr:${pr.number}`}
              {...pr}
              {...bodyPreviewProps}
            />
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
