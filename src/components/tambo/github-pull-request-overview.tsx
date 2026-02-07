"use client";

import { cn } from "@/lib/utils";
import { pickSafeDomProps } from "@/components/tambo/shared/safe-dom-props";
import { ExternalLink, GitBranch, GitPullRequest, Minus, Plus } from "lucide-react";
import * as React from "react";
import { z } from "zod";

export const githubPullRequestOverviewSchema = z
  .object({
    heading: z
      .string()
      .optional()
      .describe("Optional heading displayed above the overview card"),
    repoFullName: z
      .string()
      .optional()
      .describe("Repository full name in the form 'owner/repo'"),
    prNumber: z.number().describe("Pull request number"),
    title: z.string().describe("Pull request title"),
    state: z.string().optional().describe("PR state (open/closed/merged)"),
    draft: z.boolean().optional().describe("Whether the PR is a draft"),
    author: z.string().optional().describe("PR author username"),
    createdAt: z
      .string()
      .optional()
      .describe("PR creation time as ISO string"),
    updatedAt: z
      .string()
      .optional()
      .describe("PR last update time as ISO string"),
    head: z.string().optional().describe("Head branch name (source)"),
    base: z.string().optional().describe("Base branch name (target)"),
    additions: z.number().optional().describe("Additions count"),
    deletions: z.number().optional().describe("Deletions count"),
    changedFiles: z.number().optional().describe("Changed files count"),
    commits: z.number().optional().describe("Commits count"),
    htmlUrl: z.string().optional().describe("GitHub URL for the PR"),
    body: z
      .string()
      .nullable()
      .optional()
      .describe("Optional short preview of the PR description"),
  })
  .describe("A compact pull request overview (title, branches, and diff stats)");

export type GitHubPullRequestOverviewProps = z.infer<
  typeof githubPullRequestOverviewSchema
> & React.HTMLAttributes<HTMLDivElement>;

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

function getStateTone(state?: string) {
  const normalized = state?.toLowerCase();
  if (normalized === "open") {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (normalized === "merged") {
    return "bg-purple-500/10 text-purple-700 dark:text-purple-300";
  }
  if (normalized === "closed") {
    return "bg-muted/40 text-muted-foreground";
  }
  return "bg-muted/40 text-muted-foreground";
}

export function GitHubPullRequestOverview({
  heading = "Pull request overview",
  repoFullName,
  prNumber,
  title,
  state,
  draft,
  author,
  createdAt,
  updatedAt,
  head,
  base,
  additions,
  deletions,
  changedFiles,
  commits,
  htmlUrl,
  body,
  className,
  ...props
}: GitHubPullRequestOverviewProps) {
  const safeBody =
    body && body.length > 600 ? `${body.slice(0, 600)}…` : (body ?? null);
  const createdText = formatDate(createdAt);
  const updatedText = formatDate(updatedAt);

  const statCards: Array<{
    label: string;
    value?: number;
    icon: React.ReactNode;
    tone?: string;
  }> = [
    {
      label: "Additions",
      value: additions,
      icon: <Plus className="size-4" />, 
      tone: "text-emerald-700 dark:text-emerald-300",
    },
    {
      label: "Deletions",
      value: deletions,
      icon: <Minus className="size-4" />, 
      tone: "text-destructive dark:text-red-300",
    },
    {
      label: "Changed files",
      value: changedFiles,
      icon: <GitPullRequest className="size-4" />,
    },
    {
      label: "Commits",
      value: commits,
      icon: <GitBranch className="size-4" />,
    },
  ];

  return (
    <div className={cn("w-full", className)} {...pickSafeDomProps(props)}>
      {heading ? (
        <div className="mb-2 text-base font-semibold text-foreground">
          {heading}
        </div>
      ) : null}

      <div
        className={cn(
          "w-full rounded-xl overflow-hidden bg-gradient-to-br from-purple-500/5 via-card to-pink-500/5",
          "border border-purple-500/50",
          "shadow-sm shadow-purple-500/5 dark:shadow-purple-500/10",
        )}
      >
        <div className="flex items-start justify-between gap-4 p-4 border-b border-purple-500/20 bg-purple-500/5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs font-medium text-purple-600 dark:text-purple-400">PR #{prNumber}</div>
              {repoFullName ? (
                <div className="truncate font-mono text-xs text-muted-foreground/80">
                  {repoFullName}
                </div>
              ) : null}
              {draft ? (
                <span className="rounded-full border border-muted-foreground/20 bg-muted/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Draft
                </span>
              ) : null}
              {state ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                    getStateTone(state),
                  )}
                >
                  {state}
                </span>
              ) : null}
            </div>

            <div className="mt-1.5 truncate text-lg font-bold text-foreground tracking-tight">
              {title}
            </div>

            {(author || createdText || updatedText) && (
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground/80">
                {author ? <span className="font-medium text-foreground/80">by {author}</span> : null}
                {createdText ? <span>• opened {createdText}</span> : null}
                {updatedText ? <span>• updated {updatedText}</span> : null}
              </div>
            )}

            {head || base ? (
              <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-md border border-purple-500/20 bg-background/50 px-2.5 py-1.5 font-mono text-xs text-purple-700 dark:text-purple-300 shadow-sm">
                <GitBranch className="size-3.5" />
                <span className="truncate font-semibold">{head ?? "?"}</span>
                <span className="text-muted-foreground">→</span>
                <span className="truncate font-semibold">{base ?? "?"}</span>
              </div>
            ) : null}
          </div>

          {htmlUrl ? (
            <a
              href={htmlUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "inline-flex shrink-0 items-center justify-center size-8 rounded-lg",
                "border border-purple-500/20 bg-background/50 text-purple-600 dark:text-purple-400",
                "hover:bg-purple-500/10 hover:border-purple-500/30 transition-all shadow-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/20",
              )}
            >
              <ExternalLink className="size-4" />
            </a>
          ) : null}
        </div>

        <div className="p-4 bg-background/30">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {statCards.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-3 rounded-lg border border-purple-500/10 bg-background/50 px-3 py-2.5"
              >
                <div className={cn("p-1.5 rounded-md bg-background shadow-sm border border-border/50 text-muted-foreground", stat.tone?.replace("text-", "text-"))}>
                  {stat.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground/70">{stat.label}</div>
                  <div className="truncate text-sm font-bold text-foreground">
                    {typeof stat.value === "number"
                      ? stat.value.toLocaleString("en-US")
                      : "—"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {safeBody ? (
            <div className="mt-4 pt-4 border-t border-purple-500/10">
              <p className="line-clamp-4 text-sm text-muted-foreground/90 leading-relaxed">
                {safeBody}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
