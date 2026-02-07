"use client";

import { pickSafeDomProps } from "@/components/tambo/shared/safe-dom-props";
import { useAuth } from "@/hooks/useAuth";
import { checkRepoPermissions } from "@/lib/github";
import { createGitHubWriteConfirmation } from "@/lib/github-write-confirmation";
import { cn } from "@/lib/utils";
import {
  closePullRequest,
  createIssueComment,
  getPullRequestConfirmationInfo,
} from "@/services/github-repo";
import { ExternalLink } from "lucide-react";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

export const confirmClosePRSchema = z
  .object({
    owner: z.string().describe("GitHub repository owner/organization name"),
    repo: z.string().describe("GitHub repository name"),
    pullNumber: z.number().describe("Pull request number"),
    token: z
      .string()
      .optional()
      .describe(
        "Optional GitHub token. If omitted, the app will try to use the signed-in user's GitHub OAuth token.",
      ),
  })
  .describe(
    "A confirmation form to close a GitHub pull request. Optionally posts a comment first, then closes after the user clicks confirm.",
  );

export type ConfirmClosePRProps = z.infer<typeof confirmClosePRSchema> &
  React.HTMLAttributes<HTMLDivElement>;

function toAccessLabel(access?: string) {
  if (!access) return "unknown";
  return access;
}

function safeTrim(value: string | null | undefined) {
  if (value == null) return "";
  return value.trim();
}

function ConfirmClosePRForm({
  owner,
  repo,
  pullNumber,
  token,
  className,
  ...props
}: ConfirmClosePRProps) {
  const { session } = useAuth();

  const effectiveToken = token ?? session?.provider_token ?? undefined;
  const [commentBody, setCommentBody] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ htmlUrl: string } | null>(null);
  const [info, setInfo] = useState<
    | Awaited<ReturnType<typeof getPullRequestConfirmationInfo>>
    | null
  >(null);
  const [permission, setPermission] = useState<
    Awaited<ReturnType<typeof checkRepoPermissions>> | null
  >(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      setResult(null);

      if (!effectiveToken) {
        setInfo(null);
        setPermission(null);
        return;
      }

      try {
        const [prInfo, perms] = await Promise.all([
          getPullRequestConfirmationInfo({
            owner,
            repo,
            pullNumber,
            token: effectiveToken,
          }),
          checkRepoPermissions(owner, repo, effectiveToken),
        ]);

        if (cancelled) return;
        setInfo(prInfo);
        setPermission(perms);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load PR info");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [effectiveToken, owner, pullNumber, repo]);

  const hasWriteAccess = !!permission && (permission.push || permission.admin);
  const canSubmit = !!effectiveToken && hasWriteAccess && !isSubmitting;
  const trimmedComment = safeTrim(commentBody);

  async function handleClose() {
    if (!canSubmit) return;
    if (!effectiveToken) {
      setError("Connect GitHub (OAuth) to close pull requests.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      if (trimmedComment) {
        const commentConfirmationId = createGitHubWriteConfirmation({
          owner,
          repo,
          kind: "comment",
        });
        await createIssueComment({
          owner,
          repo,
          issueNumber: pullNumber,
          body: trimmedComment,
          token: effectiveToken,
          confirmationId: commentConfirmationId,
        });
      }

      const closeConfirmationId = createGitHubWriteConfirmation({
        owner,
        repo,
        kind: "pull_request_close",
      });
      const closed = await closePullRequest({
        owner,
        repo,
        pullNumber,
        token: effectiveToken,
        confirmationId: closeConfirmationId,
      });

      setResult({ htmlUrl: closed.htmlUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close pull request");
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
          Close GitHub Pull Request
        </div>
        <div className="text-xs text-muted-foreground">
          {owner}/{repo}#{pullNumber}
        </div>
      </div>

      {info ? (
        <div className="rounded-lg border border-muted-foreground/20 bg-muted/20 p-3 space-y-2">
          <div className="text-sm font-semibold text-foreground truncate">
            {info.title}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">
              {info.headRef} → {info.baseRef}
            </span>
            <span>•</span>
            <span className="capitalize">{info.state}</span>
          </div>
        </div>
      ) : null}

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          Optional comment
        </label>
        <textarea
          value={commentBody}
          onChange={(e) => setCommentBody(e.target.value)}
          className="min-h-24 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/30"
          placeholder="Add a short note before closing (Markdown supported)"
        />
      </div>

      {!effectiveToken && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
          Connect GitHub (OAuth) to close pull requests.
        </div>
      )}

      {effectiveToken && permission && !hasWriteAccess ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          Insufficient GitHub access: detected {toAccessLabel(permission.access)}.
          Closing requires write or admin.
        </div>
      ) : null}

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
          <div className="flex items-center justify-between gap-3">
            <span>Closed successfully.</span>
            <a
              href={result.htmlUrl}
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
          onClick={handleClose}
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

export function ConfirmClosePR(props: ConfirmClosePRProps) {
  const { owner, repo, pullNumber } = props;
  const propsKey = useMemo(
    () => [owner, repo, String(pullNumber)].join("::"),
    [owner, repo, pullNumber],
  );

  return <ConfirmClosePRForm key={propsKey} {...props} />;
}
