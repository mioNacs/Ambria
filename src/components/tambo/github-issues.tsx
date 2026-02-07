"use client";

import { cn } from "@/lib/utils";
import { parseGitHubUrl } from "@/lib/github";
import { chatRenderableStyles } from "@/components/tambo/shared/chat-renderable-styles";
import { pickSafeDomProps } from "@/components/tambo/shared/safe-dom-props";
import { ExternalLink, MessageCircle } from "lucide-react";
import * as React from "react";
import { z } from "zod";

export const githubIssueSchema = z
  .object({
    number: z.number().describe("Issue number"),
    title: z.string().describe("Issue title"),
    state: z
      .enum(["open", "closed"])
      .optional()
      .describe("Issue state (open/closed)"),
    author: z.string().optional().describe("Issue author username"),
    labels: z
      .array(z.string())
      .default([])
      .describe("Label names applied to the issue"),
    createdAt: z
      .string()
      .optional()
      .describe("Issue creation time as ISO string"),
    updatedAt: z
      .string()
      .optional()
      .describe("Issue last update time as ISO string"),
    closedAt: z
      .string()
      .nullable()
      .optional()
      .describe("Issue closed time as ISO string"),
    comments: z.number().optional().describe("Number of comments"),
    htmlUrl: z.string().optional().describe("GitHub URL for the issue"),
    body: z
      .string()
      .nullable()
      .optional()
      .describe("Optional short preview of the issue body"),
  });

const issuesApiResponseSchema = z.object({
  issues: z.array(githubIssueSchema),
});

const issuesRequestSchema = z
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
      .describe("Filter issues by state"),
    labels: z
      .string()
      .optional()
      .describe(
        "Optional comma-separated label names to filter issues (e.g. 'bug,good first issue')",
      ),
    limit: z
      .coerce
      .number()
      .int()
      .positive()
      .max(50)
      .optional()
      .describe("Number of issues to fetch per page (default 20, max 50)"),
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
    "A GitHub issues request. Prefer passing this instead of a large issues array.",
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

export const issueCardSchema = githubIssueSchema
  .extend({
    showBodyPreview: z
      .boolean()
      .optional()
      .describe("Whether to show a short preview of the issue body"),
  })
  .describe(
    "Shows a GitHub issue as a compact card (number, title, labels, author, etc.)",
  );

export type IssueCardProps = z.infer<typeof issueCardSchema> &
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
    <span className={cn(chatRenderableStyles.pill, "text-muted-foreground")}
    >
      {label}
    </span>
  );
}

export function IssueCard({
  number,
  title,
  state,
  author,
  labels,
  createdAt,
  updatedAt,
  closedAt,
  comments,
  htmlUrl,
  body,
  showBodyPreview,
  className,
  ...props
}: IssueCardProps) {
  const header = number ? `#${number}` : "Issue";
  const created = formatDate(createdAt);
  const updated = formatDate(updatedAt);
  const closed = formatDate(closedAt);
  const allLabels = (labels ?? []).filter(Boolean);
  const normalizedLabels = allLabels.slice(0, 8);
  const extraLabelsCount = allLabels.length - normalizedLabels.length;

  return (
    <div
      className={cn(
        chatRenderableStyles.subcard,
        className,
      )}
      {...pickSafeDomProps(props)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className={chatRenderableStyles.kicker}>{header}</div>
          <div className={cn(chatRenderableStyles.title, "text-base")}
          >
            {title ?? "(no title)"}
          </div>
          {(author || state || created) && (
            <div className={chatRenderableStyles.subtitle}>
              {state ? (
                <span className={cn(chatRenderableStyles.pill, "text-muted-foreground")}>
                  {state}
                </span>
              ) : null}
              {author ? <span>by {author}</span> : null}
              {created ? <span>• {created}</span> : null}
              {updated ? <span>• updated {updated}</span> : null}
              {closed ? <span>• closed {closed}</span> : null}
              {typeof comments === "number" ? (
                <span className="inline-flex items-center gap-1">
                  • <MessageCircle className="size-3.5" /> {comments}
                </span>
              ) : null}
            </div>
          )}
        </div>

        {htmlUrl ? (
          <a
            href={htmlUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(
              chatRenderableStyles.button,
              "shrink-0",
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
            <span className={cn(chatRenderableStyles.pill, "text-muted-foreground")}>
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

export const issueListSchema = z
  .object({
    title: z.string().optional().describe("Title displayed above the issue list"),
    issues: z
      .array(githubIssueSchema)
      .optional()
      .default([])
      .describe(
        "Issues to display. If non-empty, issuesRequest will be ignored.",
      ),
    issuesRequest: issuesRequestSchema
      .optional()
      .describe(
        "Optional issues request. When provided and issues are omitted, the component will fetch issues itself.",
      ),
    showBodyPreview: z
      .boolean()
      .optional()
      .describe("Whether to show a body preview for each issue"),
    emptyMessage: z
      .string()
      .optional()
      .describe("Message shown when there are no issues"),
  })
  .describe("Shows a list of GitHub issues as cards");

export type IssueListProps = z.infer<typeof issueListSchema> &
  React.HTMLAttributes<HTMLDivElement>;

export function IssueList({
  title = "Issues",
  issues: issuesProp,
  issuesRequest,
  showBodyPreview,
  emptyMessage = "No issues.",
  className,
  ...props
}: IssueListProps) {
  const [items, setItems] = React.useState(() => issuesProp ?? []);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(issuesRequest?.page ?? 1);
  const [hasMore, setHasMore] = React.useState(false);

  const issuesPropLength = issuesProp?.length ?? 0;
  const hasRequest = Boolean(issuesRequest);

  const repository = issuesRequest?.repository;
  const owner = issuesRequest?.owner;
  const repo = issuesRequest?.repo;
  const state = issuesRequest?.state;
  const labels = issuesRequest?.labels;
  const limit = issuesRequest?.limit;
  const page = issuesRequest?.page;

  const normalizedRequest = React.useMemo(() => {
    if (!hasRequest) return null;

    const ownerRepo = resolveOwnerRepo({
      repository,
      owner,
      repo,
    });

    if (!ownerRepo) return null;

    return {
      owner: ownerRepo.owner,
      repo: ownerRepo.repo,
      state,
      labels: normalizeOptionalString(labels),
      limit,
      page,
    };
  }, [
    hasRequest,
    labels,
    limit,
    owner,
    page,
    repo,
    repository,
    state,
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
        const response = await fetch("/api/github/issues", {
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
        const parsed = issuesApiResponseSchema.safeParse(payload);
        if (!parsed.success) {
          throw new Error("Received an invalid response from the server");
        }

        const next = parsed.data.issues;

        if (requestId !== requestIdRef.current) return;

        setItems((prev) => (mode === "append" ? [...prev, ...next] : next));
        setCurrentPage(page);
        setHasMore(next.length === pageSize && page < 100);
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
    // Precedence: explicit issues props override issuesRequest (no client-side pagination).
    if (issuesPropLength > 0) {
      cancelInFlight();
      setItems(issuesProp ?? []);
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
    issuesProp,
    issuesPropLength,
    normalizedRequest,
  ]);

  React.useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const bodyPreviewProps =
    typeof showBodyPreview === "boolean" ? { showBodyPreview } : undefined;

  return (
    <div
      className={cn(chatRenderableStyles.card, className)}
      {...pickSafeDomProps(props)}
    >
      <div className={chatRenderableStyles.header}>
        <div className="min-w-0">
          <h3 className={cn(chatRenderableStyles.title, "mt-0 text-base")}
          >
            {title}
          </h3>
          <div className={chatRenderableStyles.kicker}>
            {items.length.toLocaleString("en-US")} items
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-3 space-y-2">
          <div className={chatRenderableStyles.emptyState}>
            {isLoading ? "Loading…" : emptyMessage}
          </div>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
          {items.map((issue) => (
            <IssueCard
              key={issue.htmlUrl ?? `issue:${issue.number}`}
              {...issue}
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
                chatRenderableStyles.button,
                "w-full justify-center py-2 text-sm",
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
