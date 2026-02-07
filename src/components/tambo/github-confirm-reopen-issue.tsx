"use client";

import { pickSafeDomProps } from "@/components/tambo/shared/safe-dom-props";
import { useAuth } from "@/hooks/useAuth";
import { createGitHubWriteConfirmation } from "@/lib/github-write-confirmation";
import { cn } from "@/lib/utils";
import { reopenRepoIssue, createIssueComment, type Issue } from "@/services/github-repo";
import { ExternalLink } from "lucide-react";
import * as React from "react";
import { useMemo, useState, useEffect } from "react";
import { z } from "zod";

export const githubConfirmReopenIssueSchema = z
  .object({
    owner: z.string().describe("GitHub repository owner/organization name"),
    repo: z.string().describe("GitHub repository name"),
    issueNumber: z.number().describe("Issue number"),
    comment: z
      .string()
      .optional()
      .describe(
        "Optional comment to post after reopening the issue (Markdown supported).",
      ),
    token: z
      .string()
      .optional()
      .describe(
        "Optional GitHub token. If omitted, the app will try to use the signed-in user's GitHub OAuth token.",
      ),
  })
  .describe(
    "A confirmation form to reopen a closed GitHub issue. Optionally posts a comment after reopening.",
  );

export type ConfirmReopenIssueProps = z.infer<typeof githubConfirmReopenIssueSchema> &
  React.HTMLAttributes<HTMLDivElement>;

function safeTrim(value: string | null | undefined) {
  if (value == null) return "";
  return value.trim();
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}

function ConfirmReopenIssueForm({
  owner,
  repo,
  issueNumber,
  comment,
  token,
  className,
  ...props
}: ConfirmReopenIssueProps) {
  const { session } = useAuth();
  const [commentBody, setCommentBody] = useState(comment ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issueState, setIssueState] = useState<string | null>(null);
  const [result, setResult] = useState<
    | {
        issueUrl: string;
        commentUrl: string | null;
      }
    | null
  >(null);

  const effectiveToken = token ?? session?.provider_token ?? undefined;
  
  // Check issue state on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!owner || !repo || !issueNumber) return;

      try {
        const { issue } = await postJson<{ issue: Issue }>("/api/github/issue-info", {
          owner,
          repo,
          issueNumber,
          token: effectiveToken,
        });

        if (!cancelled) setIssueState(issue.state);
      } catch (e) {
        console.warn("Failed to check issue state", e);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [effectiveToken, owner, repo, issueNumber]);
  
  const canSubmit = !!effectiveToken && !isSubmitting && issueState !== "open";

  async function handleConfirm() {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      // Create confirmation for reopen
      const reopenConfirmationId = createGitHubWriteConfirmation({
        owner,
        repo,
        kind: "issue_reopen",
      });

      // Reopen first
      const reopened = await reopenRepoIssue({
        owner,
        repo,
        issueNumber,
        token: effectiveToken,
        confirmationId: reopenConfirmationId,
      });

      // Then optimize post comment if provided
      const trimmedComment = safeTrim(commentBody);
      let createdCommentUrl: string | null = null;

      if (trimmedComment) {
        const commentConfirmationId = createGitHubWriteConfirmation({
          owner,
          repo,
          kind: "comment",
        });

        const created = await createIssueComment({
          owner,
          repo,
          issueNumber,
          body: trimmedComment,
          token: effectiveToken,
          confirmationId: commentConfirmationId,
        });

        createdCommentUrl = created.htmlUrl;
      }

      setResult({ issueUrl: reopened.htmlUrl, commentUrl: createdCommentUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reopen issue");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-card to-green-500/5 p-5 space-y-5",
        "shadow-sm shadow-emerald-500/5",
        className,
      )}
      {...pickSafeDomProps(props)}
    >
      <div className="space-y-1 border-b border-emerald-500/10 pb-3">
        <div className="text-base font-semibold text-foreground">Reopen Issue</div>
        <div className="text-xs font-mono text-muted-foreground bg-emerald-500/5 px-2 py-0.5 rounded-md inline-block border border-emerald-500/10">
          {owner}/{repo}#{issueNumber}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
          Optional comment
        </label>
        <textarea
          value={commentBody}
          onChange={(e) => setCommentBody(e.target.value)}
          className="min-h-24 w-full resize-y rounded-lg border border-emerald-500/20 bg-background/60 px-3 py-2 text-sm text-foreground outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder:text-muted-foreground/50"
          placeholder="Add a reason for reopening (optional)"
        />
      </div>

      {!effectiveToken && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
          Connect GitHub (OAuth) to reopen issues.
        </div>
      )}

      {issueState === "open" && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-700 dark:text-blue-300">
          This issue is currently <strong>open</strong>.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span>Issue reopened successfully.</span>
            <a
              href={result.issueUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-background/50 px-2 py-1 text-xs text-foreground hover:bg-emerald-500/20 transition-colors"
            >
              Open <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {result.commentUrl && (
            <div className="flex items-center justify-between gap-3">
              <span>Comment posted.</span>
              <a
                href={result.commentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-background/50 px-2 py-1 text-xs text-foreground hover:bg-emerald-500/20 transition-colors"
              >
                Open <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canSubmit}
          className={cn(
            "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all",
            "hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-500/20",
            "active:scale-95",
            !canSubmit && "opacity-50 cursor-not-allowed hover:bg-emerald-600 hover:shadow-none active:scale-100",
          )}
        >
          {isSubmitting ? "Reopening…" : "Confirm & reopen"}
        </button>
      </div>
    </div>
  );
}

export function ConfirmReopenIssue(props: ConfirmReopenIssueProps) {
  const { owner, repo, issueNumber, comment } = props;
  const propsKey = useMemo(
    () => [owner, repo, String(issueNumber), comment ?? ""].join("::"),
    [comment, issueNumber, owner, repo],
  );

  return <ConfirmReopenIssueForm key={propsKey} {...props} />;
}
