"use client";

import { cn } from "@/lib/utils";
import { pickSafeDomProps } from "@/components/tambo/shared/safe-dom-props";
import { ExternalLink, GitBranch, Workflow } from "lucide-react";
import * as React from "react";
import { z } from "zod";

export const githubWorkflowRunSchema = z
  .object({
    id: z.number().describe("Workflow run ID"),
    name: z.string().optional().describe("Run name"),
    status: z.string().nullable().optional().describe("Run status"),
    conclusion: z.string().nullable().optional().describe("Run conclusion"),
    workflowId: z.number().optional().describe("Workflow ID"),
    branch: z.string().nullable().optional().describe("Branch name"),
    event: z.string().optional().describe("Trigger event (push, pull_request, etc.)"),
    createdAt: z.string().optional().describe("Created time as ISO string"),
    updatedAt: z.string().optional().describe("Updated time as ISO string"),
    htmlUrl: z.string().optional().describe("GitHub URL for the workflow run"),
    runNumber: z.number().optional().describe("Run number"),
  });

export const workflowRunsListSchema = z
  .object({
    title: z
      .string()
      .optional()
      .describe("Title displayed above the workflow runs list"),
    runs: z
      .array(githubWorkflowRunSchema)
      .describe("Workflow runs to display"),
    emptyMessage: z
      .string()
      .optional()
      .describe("Message shown when there are no workflow runs"),
  })
  .describe("Shows recent GitHub Actions workflow runs");

export type WorkflowRunsListProps = z.infer<typeof workflowRunsListSchema> &
  React.HTMLAttributes<HTMLDivElement>;

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getConclusionTone(conclusion?: string | null) {
  const c = conclusion?.toLowerCase();
  if (!c) return "bg-muted/40 text-muted-foreground";
  if (c === "success") {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (c === "failure" || c === "cancelled" || c === "timed_out") {
    return "bg-destructive/10 text-destructive";
  }
  return "bg-muted/40 text-muted-foreground";
}

export function WorkflowRunsList({
  title = "Workflow runs",
  runs = [],
  emptyMessage = "No workflow runs.",
  className,
  ...props
}: WorkflowRunsListProps) {
  const items = runs;

  return (
    <div
      className={cn(
        "w-full rounded-xl overflow-hidden bg-gradient-to-br from-sky-500/5 via-card to-teal-500/5",
        "border border-sky-500/50",
        "shadow-sm shadow-sky-500/5 dark:shadow-sky-500/10",
        className,
      )}
      {...pickSafeDomProps(props)}
    >
      <div className="flex items-baseline justify-between gap-4 p-4 border-b border-sky-500/20 bg-sky-500/5">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          {title}
          <span className="text-xs font-normal text-muted-foreground bg-background/50 px-2 py-0.5 rounded-full border border-sky-500/10">
            {items.length.toLocaleString("en-US")} items
          </span>
        </h3>
      </div>

      {items.length === 0 ? (
        <div className="p-8 text-center">
            <div className="inline-flex p-3 rounded-full bg-sky-500/10 mb-3">
              <Workflow className="size-6 text-sky-500" />
            </div>
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="p-4 space-y-2">
          {items.map((run) => {
            const dateText = formatDate(run.createdAt);
            const statusText = run.conclusion ?? run.status ?? "unknown";
            return (
              <div
                key={run.id}
                className={cn(
                  "rounded-lg border border-sky-500/20 bg-background/60 px-4 py-3",
                  "shadow-sm hover:shadow-md hover:border-sky-500/40 hover:bg-sky-500/5 transition-all text-sm",
                  "group"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Workflow className="size-4 text-sky-500/70 group-hover:text-sky-500 transition-colors" />
                      <div className="truncate font-semibold text-foreground group-hover:text-sky-700 dark:group-hover:text-sky-300 transition-colors">
                        {run.name ?? "Workflow"}
                      </div>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground/80">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 font-medium border text-[10px] uppercase tracking-wider",
                          getConclusionTone(run.conclusion),
                          run.conclusion === 'success' && "border-emerald-500/20",
                          (run.conclusion === 'failure' || run.conclusion === 'cancelled') && "border-red-500/20",
                        )}
                      >
                        {statusText}
                      </span>
                      {run.branch ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-sky-500/20 bg-sky-500/5 px-2 py-0.5 font-mono text-sky-700 dark:text-sky-300">
                          <GitBranch className="size-3" /> {run.branch}
                        </span>
                      ) : null}
                      {run.event ? <span>• {run.event}</span> : null}
                      {typeof run.runNumber === "number" ? (
                        <span>• #{run.runNumber}</span>
                      ) : null}
                      {dateText ? <span>• {dateText}</span> : null}
                    </div>
                  </div>

                  {run.htmlUrl ? (
                    <a
                      href={run.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(
                        "inline-flex shrink-0 items-center justify-center size-8 rounded-lg",
                        "border border-sky-500/20 bg-sky-500/5 text-sky-600 dark:text-sky-400",
                        "hover:bg-sky-500/10 hover:border-sky-500/30 transition-all",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/20",
                      )}
                      title="Open on GitHub"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
