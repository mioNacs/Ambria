"use client";

import { cn } from "@/lib/utils";
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
    owner: z.string().describe("GitHub repository owner/organization name"),
    repo: z.string().describe("GitHub repository name"),
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
      .number()
      .int()
      .positive()
      .max(50)
      .optional()
      .describe("Number of issues to fetch per page (default 20, max 50)"),
    page: z
      .number()
      .int()
      .positive()
      .max(100)
      .optional()
      .describe("Page number (1-indexed)"),
    token: z
      .string()
      .optional()
      .describe("Optional GitHub access token for private repos"),
  })
  .describe(
    "A GitHub issues request. Prefer passing this instead of a large issues array.",
  );

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
    <span className="rounded-md border border-muted-foreground/20 bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
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
          {(author || state || created) && (
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              {state ? (
                <span className="rounded-md border border-muted-foreground/20 bg-muted/40 px-2 py-0.5 text-muted-foreground">
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

export const issueListSchema = z
  .object({
    title: z.string().optional().describe("Title displayed above the issue list"),
    issues: z
      .array(githubIssueSchema)
      .optional()
      .default([])
      .describe("Issues to display. If provided, issuesRequest will be ignored."),
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
  const [currentPage, setCurrentPage] = React.useState(
    issuesRequest?.page ?? 1,
  );
  const [hasMore, setHasMore] = React.useState(false);

  const pageSize = React.useMemo(() => {
    if (!issuesRequest?.limit) return 20;
    return Math.max(1, Math.min(issuesRequest.limit, 50));
  }, [issuesRequest?.limit]);

  const fetchPage = React.useCallback(
    async ({ page, mode }: { page: number; mode: "replace" | "append" }) => {
      if (!issuesRequest) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/github/issues", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            ...issuesRequest,
            limit: pageSize,
            page,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(payload?.error ?? `Request failed (${response.status})`);
        }

        const payload = await response.json();
        const parsed = issuesApiResponseSchema.safeParse(payload);
        if (!parsed.success) {
          throw new Error("Received an invalid response from the server");
        }

        const next = parsed.data.issues;
        setItems((prev) => (mode === "append" ? [...prev, ...next] : next));
        setCurrentPage(page);
        setHasMore(next.length === pageSize);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [issuesRequest, pageSize],
  );

  React.useEffect(() => {
    // Precedence: explicit issues props override issuesRequest (no client-side pagination).
    if ((issuesProp?.length ?? 0) > 0) {
      setItems(issuesProp ?? []);
      setError(null);
      setIsLoading(false);
      setHasMore(false);
      setCurrentPage(1);
      return;
    }

    if (!issuesRequest) {
      setItems([]);
      setError(null);
      setHasMore(false);
      return;
    }

    const startPage = issuesRequest.page ?? 1;
    setItems([]);
    setHasMore(false);
    setCurrentPage(startPage);
    void fetchPage({ page: startPage, mode: "replace" });
  }, [fetchPage, issuesProp, issuesRequest]);

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
          {items.map((issue) => (
            <IssueCard
              key={issue.htmlUrl ?? `issue:${issue.number}`}
              {...issue}
              {...bodyPreviewProps}
            />
          ))}
          {issuesRequest && hasMore ? (
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
