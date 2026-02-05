"use client";

import { cn } from "@/lib/utils";
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

export function PullRequestCard({
  number,
  title,
  state,
  author,
  labels,
  createdAt,
  updatedAt,
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
  const merged = formatDate(mergedAt ?? undefined);
  const allLabels = (labels ?? []).filter(Boolean);
  const normalizedLabels = allLabels.slice(0, 8);
  const extraLabelsCount = allLabels.length - normalizedLabels.length;

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

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {draft ? (
              <span className="rounded-md border border-border bg-muted/30 px-2 py-0.5">
                Draft
              </span>
            ) : null}
            {state ? (
              <span className="rounded-md border border-border bg-muted/30 px-2 py-0.5">
                {state}
              </span>
            ) : null}
            {author ? <span>by {author}</span> : null}
            {created ? <span>• opened {created}</span> : null}
            {updated ? <span>• updated {updated}</span> : null}
            {merged ? (
              <span className="inline-flex items-center gap-1">
                • <GitMerge className="size-3.5" /> merged {merged}
              </span>
            ) : null}
          </div>

          {head || base ? (
            <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-border bg-muted/20 px-2 py-1 font-mono text-xs text-muted-foreground">
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
          {extraLabelsCount > 0 ? (
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
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
      .describe("Pull requests to display"),
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
  pullRequests = [],
  showBodyPreview,
  emptyMessage = "No pull requests.",
  className,
  ...props
}: PullRequestListProps) {
  const items = pullRequests;
  const bodyPreviewProps =
    typeof showBodyPreview === "boolean" ? { showBodyPreview } : undefined;

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
          {items.map((pr, index) => (
            <PullRequestCard
              key={`${pr.number ?? "pr"}-${index}`}
              {...pr}
              {...bodyPreviewProps}
            />
          ))}
        </div>
      )}
    </div>
  );
}
