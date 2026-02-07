"use client";

import { pickSafeDomProps } from "@/components/tambo/shared/safe-dom-props";
import { useAuth } from "@/hooks/useAuth";
import { checkRepoPermissions } from "@/lib/github";
import { createGitHubWriteConfirmation } from "@/lib/github-write-confirmation";
import { cn } from "@/lib/utils";
import {
  getPRReviews,
  getPullRequestConfirmationInfo,
  mergePullRequest,
  type PullRequestMergeMethod,
} from "@/services/github-repo";
import { ExternalLink } from "lucide-react";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

export const confirmMergePRSchema = z
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
    "A confirmation form to merge a GitHub pull request. Shows mergeability/checks summary and only merges after the user clicks confirm.",
  );

export type ConfirmMergePRProps = z.infer<typeof confirmMergePRSchema> &
  React.HTMLAttributes<HTMLDivElement>;

function toAccessLabel(access?: string) {
  if (!access) return "unknown";
  return access;
}

function summarizeReviews(reviews: Array<{ author: string; state: string }>) {
  const latestByAuthor = new Map<string, string>();
  for (const review of reviews) {
    if (!review.author) continue;
    latestByAuthor.set(review.author, review.state);
  }

  let approvals = 0;
  let changesRequested = 0;
  for (const state of latestByAuthor.values()) {
    if (state === "APPROVED") approvals += 1;
    if (state === "CHANGES_REQUESTED") changesRequested += 1;
  }

  return { approvals, changesRequested };
}

function ConfirmMergePRForm({
  owner,
  repo,
  pullNumber,
  token,
  className,
  ...props
}: ConfirmMergePRProps) {
  const { session } = useAuth();

  const effectiveToken = token ?? session?.provider_token ?? undefined;
  const [mergeMethod, setMergeMethod] = useState<PullRequestMergeMethod>("merge");
  const [deleteBranch, setDeleteBranch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<
    | { htmlUrl: string; sha: string; branchDeleted: boolean }
    | null
  >(null);

  const [info, setInfo] = useState<
    | Awaited<ReturnType<typeof getPullRequestConfirmationInfo>>
    | null
  >(null);
  const [permission, setPermission] = useState<
    Awaited<ReturnType<typeof checkRepoPermissions>> | null
  >(null);
  const [reviewSummary, setReviewSummary] = useState<
    { approvals: number; changesRequested: number } | null
  >(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      setResult(null);

      if (!effectiveToken) {
        setInfo(null);
        setPermission(null);
        setReviewSummary(null);
        return;
      }

      try {
        const [prInfo, perms, reviews] = await Promise.all([
          getPullRequestConfirmationInfo({
            owner,
            repo,
            pullNumber,
            token: effectiveToken,
          }),
          checkRepoPermissions(owner, repo, effectiveToken),
          getPRReviews({ owner, repo, pullNumber, token: effectiveToken }),
        ]);

        if (cancelled) return;
        setInfo(prInfo);
        setPermission(perms);
        setReviewSummary(summarizeReviews(reviews));
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

  async function handleMerge() {
    if (!canSubmit) return;
    if (!effectiveToken) {
      setError("Connect GitHub (OAuth) to merge pull requests.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const confirmationId = createGitHubWriteConfirmation({
        owner,
        repo,
        kind: "pull_request_merge",
      });

      const merged = await mergePullRequest({
        owner,
        repo,
        pullNumber,
        mergeMethod,
        deleteBranch,
        token: effectiveToken,
        confirmationId,
      });

      setResult({
        htmlUrl: merged.htmlUrl,
        sha: merged.sha,
        branchDeleted: merged.branchDeleted,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to merge pull request");
    } finally {
      setIsSubmitting(false);
    }
  }

  const checksLabel = useMemo(() => {
    if (!info?.checks) return "Checks: unknown";
    const parts = [
      `Checks: ${info.checks.state}`,
      info.checks.totalCount ? `${info.checks.totalCount} total` : "0 total",
    ];
    if (info.checks.failingCount) parts.push(`${info.checks.failingCount} failing`);
    if (info.checks.pendingCount) parts.push(`${info.checks.pendingCount} pending`);
    return parts.join(" • ");
  }, [info?.checks]);

  const mergeableLabel = useMemo(() => {
    if (!info) return "Mergeability: unknown";
    const base =
      info.mergeable === true
        ? "Mergeability: mergeable"
        : info.mergeable === false
          ? "Mergeability: conflicts"
          : "Mergeability: unknown";
    return info.mergeableState ? `${base} (${info.mergeableState})` : base;
  }, [info]);

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
          Merge GitHub Pull Request
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
            <span>{mergeableLabel}</span>
          </div>
          <div className="text-xs text-muted-foreground">{checksLabel}</div>

          {reviewSummary ? (
            <div className="text-xs text-muted-foreground">
              Reviews: {reviewSummary.approvals} approved
              {reviewSummary.changesRequested
                ? ` • ${reviewSummary.changesRequested} changes requested`
                : ""}
            </div>
          ) : null}
        </div>
      ) : null}

      {!effectiveToken && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
          Connect GitHub (OAuth) to merge pull requests.
        </div>
      )}

      {effectiveToken && permission && !hasWriteAccess ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          Insufficient GitHub access: detected {toAccessLabel(permission.access)}.
          Merging requires write or admin.
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
            <span>
              Merged successfully ({result.sha.slice(0, 7)})
              {result.branchDeleted ? " • branch deleted" : ""}.
            </span>
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

      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Merge method
          </label>
          <select
            value={mergeMethod}
            onChange={(e) => setMergeMethod(e.target.value as PullRequestMergeMethod)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/30"
          >
            <option value="merge">Merge commit</option>
            <option value="squash">Squash and merge</option>
            <option value="rebase">Rebase and merge</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={deleteBranch}
            onChange={(e) => setDeleteBranch(e.target.checked)}
            className="h-4 w-4 rounded border border-border"
          />
          Delete head branch after merge (only works for branches in the same repo)
        </label>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleMerge}
          disabled={!canSubmit}
          className={cn(
            "rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity",
            !canSubmit && "opacity-50 cursor-not-allowed",
          )}
        >
          {isSubmitting ? "Merging…" : "Confirm & merge"}
        </button>
      </div>
    </div>
  );
}

export function ConfirmMergePR(props: ConfirmMergePRProps) {
  const { owner, repo, pullNumber } = props;
  const propsKey = useMemo(
    () => [owner, repo, String(pullNumber)].join("::"),
    [owner, repo, pullNumber],
  );

  return <ConfirmMergePRForm key={propsKey} {...props} />;
}
