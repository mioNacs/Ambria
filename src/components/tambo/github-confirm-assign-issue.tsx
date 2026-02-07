"use client";

import { pickSafeDomProps } from "@/components/tambo/shared/safe-dom-props";
import { useAuth } from "@/hooks/useAuth";
import { createGitHubWriteConfirmation } from "@/lib/github-write-confirmation";
import { cn } from "@/lib/utils";
import { setIssueAssignees } from "@/services/github-repo";
import { ExternalLink } from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import { z } from "zod";

export const githubConfirmAssignIssueSchema = z
  .object({
    owner: z.string().describe("GitHub repository owner/organization name"),
    repo: z.string().describe("GitHub repository name"),
    issueNumber: z.number().describe("Issue number"),
    assignees: z
      .array(z.string())
      .optional()
      .describe(
        "GitHub usernames to assign. Pass an empty list to clear all assignees.",
      ),
    token: z
      .string()
      .optional()
      .describe(
        "Optional GitHub token. If omitted, the app will try to use the signed-in user's GitHub OAuth token.",
      ),
  })
  .describe(
    "A confirmation form to assign/unassign issue assignees and apply the change only after the user clicks confirm.",
  );

export type ConfirmAssignIssueProps =
  z.infer<typeof githubConfirmAssignIssueSchema> &
    React.HTMLAttributes<HTMLDivElement>;

function toCsv(value: string[] | undefined) {
  if (!value?.length) return "";
  return value.join(", ");
}

function parseCsv(value: string) {
  const entries = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return entries;
}

function ConfirmAssignIssueForm({
  owner,
  repo,
  issueNumber,
  assignees,
  token,
  className,
  ...props
}: ConfirmAssignIssueProps) {
  const { session } = useAuth();
  const [assigneesCsv, setAssigneesCsv] = useState(toCsv(assignees));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState<
    | {
        htmlUrl: string;
        assignees: string[];
      }
    | null
  >(null);

  const effectiveToken = token ?? session?.provider_token ?? undefined;
  const canSubmit = !!effectiveToken && !isSubmitting;

  async function handleConfirm() {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);
    setUpdated(null);

    try {
      const confirmationId = createGitHubWriteConfirmation({
        owner,
        repo,
        kind: "issue_assignees",
      });

      const result = await setIssueAssignees({
        owner,
        repo,
        issueNumber,
        assignees: parseCsv(assigneesCsv),
        token: effectiveToken,
        confirmationId,
      });

      setUpdated({ htmlUrl: result.htmlUrl, assignees: result.assignees });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update assignees",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 via-card to-indigo-500/5 p-5 space-y-5",
        "shadow-sm shadow-blue-500/5",
        className,
      )}
      {...pickSafeDomProps(props)}
    >
      <div className="space-y-1 border-b border-blue-500/10 pb-3">
        <div className="text-base font-semibold text-foreground flex items-center gap-2">
          Assign / Unassign Issue
        </div>
        <div className="text-xs font-mono text-muted-foreground bg-blue-500/5 px-2 py-0.5 rounded-md inline-block border border-blue-500/10">
          {owner}/{repo}#{issueNumber}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">
          Assignees (comma-separated)
        </label>
        <input
          value={assigneesCsv}
          onChange={(e) => setAssigneesCsv(e.target.value)}
          className="w-full rounded-lg border border-blue-500/20 bg-background/60 px-3 py-2 text-sm text-foreground outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-muted-foreground/50"
          placeholder="octocat, monalisa"
        />
        <div className="text-[11px] text-muted-foreground/80 pl-1">
          Leave blank to clear all assignees.
        </div>
      </div>

      {!effectiveToken && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
          Connect GitHub (OAuth) to assign issues.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {updated && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
          <div className="flex items-center justify-between gap-3">
            <span>
              Updated assignees: {updated.assignees.join(", ") || "(none)"}
            </span>
            <a
              href={updated.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-background/50 px-2 py-1 text-xs text-foreground hover:bg-emerald-500/20 transition-colors"
            >
              Open <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canSubmit}
          className={cn(
            "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all",
            "hover:bg-blue-700 hover:shadow-md hover:shadow-blue-500/20",
            "active:scale-95",
            !canSubmit && "opacity-50 cursor-not-allowed hover:bg-blue-600 hover:shadow-none active:scale-100",
          )}
        >
          {isSubmitting ? "Updating…" : "Confirm & update"}
        </button>
      </div>
    </div>
  );
}

export function ConfirmAssignIssue(props: ConfirmAssignIssueProps) {
  const { owner, repo, issueNumber, assignees } = props;
  const propsKey = useMemo(
    () =>
      [owner, repo, String(issueNumber), (assignees ?? []).join("|")].join(
        "::",
      ),
    [assignees, issueNumber, owner, repo],
  );

  return <ConfirmAssignIssueForm key={propsKey} {...props} />;
}
