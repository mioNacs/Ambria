"use client";

import { pickSafeDomProps } from "@/components/tambo/shared/safe-dom-props";
import { useAuth } from "@/hooks/useAuth";
import { createGitHubWriteConfirmation } from "@/lib/github-write-confirmation";
import { cn } from "@/lib/utils";
import { createIssueComment } from "@/services/github-repo";
import { ExternalLink } from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import { z } from "zod";

export const githubCreateCommentSchema = z
  .object({
    owner: z.string().describe("GitHub repository owner/organization name"),
    repo: z.string().describe("GitHub repository name"),
    issueNumber: z
      .number()
      .describe("Issue or pull request number to comment on"),
    body: z
      .string()
      .describe("Comment body (GitHub-flavored Markdown)")
      .optional(),
    token: z
      .string()
      .optional()
      .describe(
        "Optional GitHub token. If omitted, the app will try to use the signed-in user's GitHub OAuth token.",
      ),
  })
  .describe(
    "A form that previews and posts a GitHub comment on an issue or pull request after the user confirms.",
  );

export type GitHubCreateCommentProps = z.infer<typeof githubCreateCommentSchema> &
  React.HTMLAttributes<HTMLDivElement>;

function GitHubCreateCommentForm({
  owner,
  repo,
  issueNumber,
  body,
  token,
  className,
  ...props
}: GitHubCreateCommentProps) {
  const { session } = useAuth();
  const [commentBody, setCommentBody] = useState(body ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);

  const effectiveToken = token ?? session?.provider_token ?? undefined;
  const canSubmit = !!commentBody.trim() && !!effectiveToken && !isSubmitting;

  async function handleCreate() {
    if (!canSubmit) return;
    if (!effectiveToken) {
      setError("Connect GitHub (OAuth) to post comments.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setCreatedUrl(null);

    try {
      const confirmationId = createGitHubWriteConfirmation({
        owner,
        repo,
        kind: "comment",
      });
      const created = await createIssueComment({
        owner,
        repo,
        issueNumber,
        body: commentBody,
        token: effectiveToken,
        confirmationId,
      });

      setCreatedUrl(created.htmlUrl);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create comment",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className={cn(
        "w-full rounded-xl overflow-hidden bg-gradient-to-br from-amber-500/5 via-card to-orange-500/5",
        "border border-amber-500/50",
        "shadow-sm shadow-amber-500/5 dark:shadow-amber-500/10",
        className,
      )}
      {...pickSafeDomProps(props)}
    >
      <div className="relative px-4 py-3 border-b border-amber-500/20 bg-muted/30 flex items-center justify-between gap-4">
         <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-square-plus"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" x2="15" y1="10" y2="10"/><line x1="12" x2="12" y1="7" y2="13"/></svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground tracking-tight">
              Post GitHub Comment
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">
              {owner}/{repo}#{issueNumber}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground ml-0.5">Body</label>
          <textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            className="min-h-28 w-full resize-y rounded-lg border border-amber-500/30 bg-muted/10 px-3 py-2 text-sm text-foreground outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20 transition-all placeholder:text-muted-foreground/50"
            placeholder="Write a comment (Markdown supported)"
          />
        </div>

        {!effectiveToken && (
           <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-triangle shrink-0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            Connect GitHub (OAuth) to post comments.
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive flex items-center gap-2">
             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x-circle shrink-0"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
            {error}
          </div>
        )}

        {createdUrl && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-700 dark:text-emerald-400">
           <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle-2 shrink-0"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                Comment posted successfully.
              </span>
              <a
                href={createdUrl}
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
               "rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-amber-500/20 transition-all hover:shadow-lg hover:shadow-amber-500/30 hover:brightness-110 active:scale-[0.98]",
              !canSubmit && "opacity-50 cursor-not-allowed grayscale shadow-none",
            )}
          >
            {isSubmitting ? (
               <span className="flex items-center gap-2">
                <svg className="animate-spin h-3.5 w-3.5 text-white/80" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Posting...
             </span>
            ) : "Confirm & post"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function GitHubCreateComment(props: GitHubCreateCommentProps) {
  const { owner, repo, issueNumber, body } = props;
  const propsKey = useMemo(
    () => [owner, repo, String(issueNumber), body ?? ""].join("::"),
    [body, issueNumber, owner, repo],
  );

  return <GitHubCreateCommentForm key={propsKey} {...props} />;
}
