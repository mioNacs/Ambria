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
        "rounded-xl border border-border bg-background p-4 space-y-4",
        className,
      )}
      {...pickSafeDomProps(props)}
    >
      <div className="space-y-1">
        <div className="text-sm font-semibold text-foreground">
          Create GitHub Issue
        </div>
        <div className="text-xs text-muted-foreground">
          {owner}/{repo}
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Title
          </label>
          <input
            value={issueTitle}
            onChange={(e) => setIssueTitle(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/30"
            placeholder="Issue title"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Body
          </label>
          <textarea
            value={issueBody}
            onChange={(e) => setIssueBody(e.target.value)}
            className="min-h-28 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/30"
            placeholder="Describe the issue (Markdown supported)"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Labels (comma-separated)
            </label>
            <input
              value={labelsCsv}
              onChange={(e) => setLabelsCsv(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/30"
              placeholder="bug, enhancement"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Assignees (comma-separated)
            </label>
            <input
              value={assigneesCsv}
              onChange={(e) => setAssigneesCsv(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/30"
              placeholder="octocat"
            />
          </div>
        </div>
      </div>

      {!effectiveToken && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
          Connect GitHub (OAuth) to create issues.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {createdIssue && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
          <div className="flex items-center justify-between gap-3">
            <span>Issue #{createdIssue.number} created successfully.</span>
            <a
              href={createdIssue.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-muted"
            >
              Open <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleCreate}
          disabled={!canSubmit}
          className={cn(
            "rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity",
            !canSubmit && "opacity-50 cursor-not-allowed",
          )}
        >
          {isSubmitting ? "Creating…" : "Confirm & create"}
        </button>
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
