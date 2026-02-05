"use client";

import { cn } from "@/lib/utils";
import { ExternalLink, MessageCircle } from "lucide-react";
import * as React from "react";
import { z } from "zod";

export const githubIssueSchema = z
  .object({
    number: z.number().describe("Issue number"),
    title: z.string().describe("Issue title"),
    state: z.string().optional().describe("Issue state (open/closed)"),
    author: z.string().optional().describe("Issue author username"),
    labels: z
      .array(z.string())
      .optional()
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
  })
  .partial();

export const issueCardSchema = githubIssueSchema
  .extend({
    showBodyPreview: z
      .boolean()
      .optional()
      .describe("Whether to show a short preview of the issue body"),
  })
  .partial()
  .describe(
    "Shows a GitHub issue as a compact card (number, title, labels, author, etc.)",
  );

export type IssueCardProps = z.infer<typeof issueCardSchema> &
  React.HTMLAttributes<HTMLDivElement>;

function formatDate(value?: string) {
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
    <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
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
  comments,
  htmlUrl,
  body,
  showBodyPreview,
  className,
  ...props
}: IssueCardProps) {
  const header = number ? `#${number}` : "Issue";
  const created = formatDate(createdAt);
  const normalizedLabels = (labels ?? []).filter(Boolean).slice(0, 8);

  return (
    <div
      className={cn(
        "w-full rounded-lg border border-border bg-background p-4",
        className,
      )}
      {...props}
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
                <span className="rounded-md border border-border bg-muted/30 px-2 py-0.5">
                  {state}
                </span>
              ) : null}
              {author ? <span>by {author}</span> : null}
              {created ? <span>• {created}</span> : null}
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
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-muted/30 px-2 py-1 text-xs text-foreground hover:bg-muted/40"
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
      .describe("Issues to display"),
    showBodyPreview: z
      .boolean()
      .optional()
      .describe("Whether to show a body preview for each issue"),
    emptyMessage: z
      .string()
      .optional()
      .describe("Message shown when there are no issues"),
  })
  .partial()
  .describe("Shows a list of GitHub issues as cards");

export type IssueListProps = z.infer<typeof issueListSchema> &
  React.HTMLAttributes<HTMLDivElement>;

export function IssueList({
  title = "Issues",
  issues,
  showBodyPreview,
  emptyMessage = "No issues.",
  className,
  ...props
}: IssueListProps) {
  const items = issues ?? [];

  return (
    <div className={cn("w-full", className)} {...props}>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <div className="text-xs text-muted-foreground">
          {items.length.toLocaleString("en-US")} items
        </div>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="mt-3 space-y-3">
          {items.map((issue, index) => (
            <IssueCard
              key={`${issue.number ?? "issue"}-${index}`}
              {...issue}
              showBodyPreview={showBodyPreview}
            />
          ))}
        </div>
      )}
    </div>
  );
}
