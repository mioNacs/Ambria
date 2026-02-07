"use client";

import { cn } from "@/lib/utils";
import { chatRenderableStyles } from "@/components/tambo/shared/chat-renderable-styles";
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
        className={chatRenderableStyles.card}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className={chatRenderableStyles.kicker}>PR #{prNumber}</div>
              {repoFullName ? (
                <div className="truncate font-mono text-xs text-muted-foreground">
                  {repoFullName}
                </div>
              ) : null}
              {draft ? (
                <span className={cn(chatRenderableStyles.pill, "text-muted-foreground")}>
                  Draft
                </span>
              ) : null}
              {state ? (
                <span
                  className={cn(
                    chatRenderableStyles.pill,
                    getStateTone(state),
                  )}
                >
                  {state}
                </span>
              ) : null}
            </div>

            <div className={cn(chatRenderableStyles.title, "text-base")}>
              {title}
            </div>

            {(author || createdText || updatedText) && (
              <div className={chatRenderableStyles.subtitle}>
                {author ? <span>by {author}</span> : null}
                {createdText ? <span>• opened {createdText}</span> : null}
                {updatedText ? <span>• updated {updatedText}</span> : null}
              </div>
            )}

            {head || base ? (
              <div
                className={cn(chatRenderableStyles.pill, "mt-3 max-w-full font-mono")}
              >
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
              className={cn(chatRenderableStyles.button, "shrink-0")}
            >
              Open <ExternalLink className="size-3.5" />
            </a>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className={cn(
                chatRenderableStyles.section,
                "flex items-center gap-2 py-2",
              )}
            >
              <div className={cn("text-muted-foreground", stat.tone)}>
                {stat.icon}
              </div>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">{stat.label}</div>
                <div className="truncate text-sm font-semibold text-foreground">
                  {typeof stat.value === "number"
                    ? stat.value.toLocaleString("en-US")
                    : "—"}
                </div>
              </div>
            </div>
          ))}
        </div>

        {safeBody ? (
          <p className="mt-4 line-clamp-4 text-sm text-muted-foreground">
            {safeBody}
          </p>
        ) : null}
      </div>
    </div>
  );
}
