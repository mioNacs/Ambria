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
  if (!c) return "bg-muted/30 text-muted-foreground";
  if (c === "success") return "bg-emerald-500/10 text-emerald-700";
  if (c === "failure" || c === "cancelled" || c === "timed_out") {
    return "bg-destructive/10 text-destructive";
  }
  return "bg-muted/30 text-muted-foreground";
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
    <div className={cn("w-full", className)} {...pickSafeDomProps(props)}>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <div className="text-xs text-muted-foreground">
          {items.length.toLocaleString("en-US")} items
        </div>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((run) => {
            const dateText = formatDate(run.createdAt);
            const statusText = run.conclusion ?? run.status ?? "unknown";
            return (
              <div
                key={run.id}
                className="rounded-lg border border-border bg-background px-3 py-2"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Workflow className="size-4 text-muted-foreground" />
                      <div className="truncate text-sm font-medium text-foreground">
                        {run.name ?? "Workflow"}
                      </div>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 font-medium",
                          getConclusionTone(run.conclusion),
                        )}
                      >
                        {statusText}
                      </span>
                      {run.branch ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/20 px-2 py-0.5 font-mono">
                          <GitBranch className="size-3.5" /> {run.branch}
                        </span>
                      ) : null}
                      {run.event ? <span>• {run.event}</span> : null}
                      {typeof run.runNumber === "number" ? (
                        <span>• run #{run.runNumber}</span>
                      ) : null}
                      {dateText ? <span>• {dateText}</span> : null}
                    </div>
                  </div>

                  {run.htmlUrl ? (
                    <a
                      href={run.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-muted/30 px-2 py-1 text-xs text-foreground hover:bg-muted/40"
                    >
                      Open <ExternalLink className="size-3.5" />
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
