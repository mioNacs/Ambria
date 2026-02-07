"use client";

import { pickSafeDomProps } from "@/components/tambo/shared/safe-dom-props";
import { chatRenderableStyles } from "@/components/tambo/shared/chat-renderable-styles";
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
        chatRenderableStyles.card,
        "space-y-4",
        className,
      )}
      {...pickSafeDomProps(props)}
    >
      <div className="space-y-1">
        <div className={cn(chatRenderableStyles.title, "mt-0")}>
          Post GitHub Comment
        </div>
        <div className={chatRenderableStyles.kicker}>
          {owner}/{repo}#{issueNumber}
        </div>
      </div>

      <div className="space-y-1">
        <label className={chatRenderableStyles.sectionTitle}>Body</label>
        <textarea
          value={commentBody}
          onChange={(e) => setCommentBody(e.target.value)}
          className={cn(chatRenderableStyles.textarea, "min-h-28")}
          placeholder="Write a comment (Markdown supported)"
        />
      </div>

      {!effectiveToken && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
          Connect GitHub (OAuth) to post comments.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {createdUrl && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
          <div className="flex items-center justify-between gap-3">
            <span>Comment posted successfully.</span>
            <a
              href={createdUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(chatRenderableStyles.button, "bg-background")}
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
          className={chatRenderableStyles.buttonPrimary}
        >
          {isSubmitting ? "Posting…" : "Confirm & post"}
        </button>
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
