"use client";

import { pickSafeDomProps } from "@/components/tambo/shared/safe-dom-props";
import { useAuth } from "@/hooks/useAuth";
import { createGitHubWriteConfirmation } from "@/lib/github-write-confirmation";
import { cn } from "@/lib/utils";
import { createRepoIssue } from "@/services/github-repo";
import { ExternalLink } from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import { z } from "zod";

export const githubCreateIssueSchema = z
  .object({
    owner: z.string().describe("GitHub repository owner/organization name"),
    repo: z.string().describe("GitHub repository name"),
    title: z.string().describe("Issue title"),
    body: z
      .string()
      .optional()
      .describe("Issue body (GitHub-flavored Markdown)"),
    labels: z
      .array(z.string())
      .optional()
      .describe("Optional label names to apply to the issue"),
    assignees: z
      .array(z.string())
      .optional()
      .describe("Optional GitHub usernames to assign"),
    token: z
      .string()
      .optional()
      .describe(
        "Optional GitHub token. If omitted, the app will try to use the signed-in user's GitHub OAuth token.",
      ),
  })
  .describe(
    "A form that previews and creates a GitHub issue after the user confirms.",
  );

export type GitHubCreateIssueProps = z.infer<typeof githubCreateIssueSchema> &
  React.HTMLAttributes<HTMLDivElement>;

function safeTrim(value: string | null | undefined) {
  if (value == null) return "";
  return value.trim();
}

function toCsv(value: string[] | undefined) {
  if (!value?.length) return "";
  return value.join(", ");
}

function parseCsv(value: string) {
  const entries = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return entries.length ? entries : undefined;
}

function GitHubCreateIssueForm({
  owner,
  repo,
  title,
  body,
  labels,
  assignees,
  token,
  createdIssue,
  setCreatedIssue,
  className,
  ...props
}: GitHubCreateIssueProps & {
  createdIssue: { htmlUrl: string; number: number } | null;
  setCreatedIssue: (value: { htmlUrl: string; number: number } | null) => void;
}) {
  const { session } = useAuth();
  const [issueTitle, setIssueTitle] = useState<string>(() => title ?? "");
  const [issueBody, setIssueBody] = useState(body ?? "");
  const [labelsCsv, setLabelsCsv] = useState(toCsv(labels));
  const [assigneesCsv, setAssigneesCsv] = useState(toCsv(assignees));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveToken = token ?? session?.provider_token ?? undefined;
  const trimmedTitle = safeTrim(issueTitle);
  const trimmedBody = safeTrim(issueBody);
  const canSubmit = !!trimmedTitle && !!effectiveToken && !isSubmitting;

  async function handleCreate() {
    if (!canSubmit) return;
    if (!effectiveToken) {
      setError("Connect GitHub (OAuth) to create issues.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setCreatedIssue(null);

    try {
      const confirmationId = createGitHubWriteConfirmation({
        owner,
        repo,
        kind: "issue",
      });
      const created = await createRepoIssue({
        owner,
        repo,
        title: trimmedTitle,
        body: trimmedBody ? trimmedBody : undefined,
        labels: parseCsv(labelsCsv),
        assignees: parseCsv(assigneesCsv),
        token: effectiveToken,
        confirmationId,
      });

      setCreatedIssue({ htmlUrl: created.htmlUrl, number: created.number });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create issue");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className={cn(
        "w-full rounded-xl overflow-hidden bg-gradient-to-br from-blue-500/5 via-card to-cyan-500/5",
        "border border-blue-500/50",
        "shadow-sm shadow-blue-500/5 dark:shadow-blue-500/10",
        className,
      )}
      {...pickSafeDomProps(props)}
    >
      <div className="relative px-4 py-3 border-b border-blue-500/20 bg-muted/30 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-dot"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1"/></svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground tracking-tight">
              Create GitHub Issue
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">
              {owner}/{repo}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground ml-0.5">
            Title
          </label>
          <input
            value={issueTitle}
            onChange={(e) => setIssueTitle(e.target.value)}
            className="w-full rounded-lg border border-blue-500/30 bg-muted/10 px-3 py-2 text-sm text-foreground outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-muted-foreground/50"
            placeholder="Issue title"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground ml-0.5">
            Body
          </label>
          <textarea
            value={issueBody}
            onChange={(e) => setIssueBody(e.target.value)}
            className="min-h-28 w-full resize-y rounded-lg border border-blue-500/30 bg-muted/10 px-3 py-2 text-sm text-foreground outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-muted-foreground/50"
            placeholder="Describe the issue (Markdown supported)"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground ml-0.5">
              Labels <span className="opacity-50 font-normal">(comma-separated)</span>
            </label>
            <input
              value={labelsCsv}
              onChange={(e) => setLabelsCsv(e.target.value)}
              className="w-full rounded-lg border border-blue-500/30 bg-muted/10 px-3 py-2 text-sm text-foreground outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-muted-foreground/50"
              placeholder="bug, enhancement"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground ml-0.5">
              Assignees <span className="opacity-50 font-normal">(comma-separated)</span>
            </label>
            <input
              value={assigneesCsv}
              onChange={(e) => setAssigneesCsv(e.target.value)}
              className="w-full rounded-lg border border-blue-500/30 bg-muted/10 px-3 py-2 text-sm text-foreground outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-muted-foreground/50"
              placeholder="octocat"
            />
          </div>
        </div>

        {!effectiveToken && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-triangle shrink-0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            Connect GitHub (OAuth) to create issues.
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x-circle shrink-0"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
            {error}
          </div>
        )}

        {createdIssue && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-700 dark:text-emerald-400">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle-2 shrink-0"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                Issue #{createdIssue.number} created successfully.
              </span>
              <a
                href={createdIssue.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-500/20 transition-colors"
              >
                Open <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleCreate}
            disabled={!canSubmit}
            className={cn(
              "rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-blue-500/20 transition-all hover:shadow-lg hover:shadow-blue-500/30 hover:brightness-110 active:scale-[0.98]",
              !canSubmit && "opacity-50 cursor-not-allowed grayscale shadow-none",
            )}
          >
            {isSubmitting ? (
                 <span className="flex items-center gap-2">
                    <svg className="animate-spin h-3.5 w-3.5 text-white/80" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                 </span>
            ) : "Confirm & create"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function GitHubCreateIssue(props: GitHubCreateIssueProps) {
  const { owner, repo, title, body, labels, assignees } = props;
  const propsKey = useMemo(
    () =>
      [owner, repo, title, body ?? "", (labels ?? []).join("|"), (assignees ?? []).join("|")].join(
        "::",
      ),
    [assignees, body, labels, owner, repo, title],
  );

  const [createdIssueState, setCreatedIssueState] = useState<
    { key: string; value: { htmlUrl: string; number: number } | null }
  >(() => ({ key: propsKey, value: null }));
  const createdIssue =
    createdIssueState.key === propsKey ? createdIssueState.value : null;
  const setCreatedIssue = (value: { htmlUrl: string; number: number } | null) => {
    setCreatedIssueState({ key: propsKey, value });
  };

  return (
    <GitHubCreateIssueForm
      key={propsKey}
      {...props}
      createdIssue={createdIssue}
      setCreatedIssue={setCreatedIssue}
    />
  );
}
