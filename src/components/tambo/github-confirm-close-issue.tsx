"use client";

import { pickSafeDomProps } from "@/components/tambo/shared/safe-dom-props";
import { useAuth } from "@/hooks/useAuth";
import { createGitHubWriteConfirmation } from "@/lib/github-write-confirmation";
import { cn } from "@/lib/utils";
import { closeRepoIssue, createIssueComment } from "@/services/github-repo";
import { ExternalLink } from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import { z } from "zod";

export const githubConfirmCloseIssueSchema = z
  .object({
    owner: z.string().describe("GitHub repository owner/organization name"),
    repo: z.string().describe("GitHub repository name"),
    issueNumber: z.number().describe("Issue number"),
    comment: z
      .string()
      .optional()
      .describe(
        "Optional comment to post before closing the issue (Markdown supported).",
      ),
    token: z
      .string()
      .optional()
      .describe(
        "Optional GitHub token. If omitted, the app will try to use the signed-in user's GitHub OAuth token.",
      ),
  })
  .describe(
    "A confirmation form to close a GitHub issue. Optionally posts a comment before closing.",
  );

export type ConfirmCloseIssueProps = z.infer<typeof githubConfirmCloseIssueSchema> &
  React.HTMLAttributes<HTMLDivElement>;

function safeTrim(value: string | null | undefined) {
  if (value == null) return "";
  return value.trim();
}

function ConfirmCloseIssueForm({
  owner,
  repo,
  issueNumber,
  comment,
  token,
  className,
  ...props
}: ConfirmCloseIssueProps) {
  const { session } = useAuth();
  const [commentBody, setCommentBody] = useState(comment ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<
    | {
        issueUrl: string;
        commentUrl: string | null;
      }
    | null
  >(null);

  const effectiveToken = token ?? session?.provider_token ?? undefined;
  const canSubmit = !!effectiveToken && !isSubmitting;

  async function handleConfirm() {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
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

      const closeConfirmationId = createGitHubWriteConfirmation({
        owner,
        repo,
        kind: "issue_close",
      });

      const closed = await closeRepoIssue({
        owner,
        repo,
        issueNumber,
        token: effectiveToken,
        confirmationId: closeConfirmationId,
      });

      setResult({ issueUrl: closed.htmlUrl, commentUrl: createdCommentUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close issue");
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
        <div className="text-sm font-semibold text-foreground">Close Issue</div>
        <div className="text-xs text-muted-foreground">
          {owner}/{repo}#{issueNumber}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Optional comment
        </label>
        <textarea
          value={commentBody}
          onChange={(e) => setCommentBody(e.target.value)}
          className="min-h-24 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/30"
          placeholder="Add a closing note (optional)"
        />
      </div>

      {!effectiveToken && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
          Connect GitHub (OAuth) to close issues.
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
            <span>Issue closed successfully.</span>
            <a
              href={result.issueUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-muted"
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
                className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-muted"
              >
                Open <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canSubmit}
          className={cn(
            "rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity",
            !canSubmit && "opacity-50 cursor-not-allowed",
          )}
        >
          {isSubmitting ? "Closing…" : "Confirm & close"}
        </button>
      </div>
    </div>
  );
}

export function ConfirmCloseIssue(props: ConfirmCloseIssueProps) {
  const { owner, repo, issueNumber, comment } = props;
  const propsKey = useMemo(
    () => [owner, repo, String(issueNumber), comment ?? ""].join("::"),
    [comment, issueNumber, owner, repo],
  );

  return <ConfirmCloseIssueForm key={propsKey} {...props} />;
}
