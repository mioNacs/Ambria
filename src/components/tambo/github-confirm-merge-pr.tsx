"use client";

import { pickSafeDomProps } from "@/components/tambo/shared/safe-dom-props";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type {
  PullRequestConfirmationInfo,
  PullRequestMergeMethod,
} from "@/services/github-repo";
import { ExternalLink } from "lucide-react";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

export const confirmMergePRSchema = z
  .object({
    owner: z
      .string()
      .trim()
      .min(1)
      .describe("GitHub repository owner/organization name"),
    repo: z.string().trim().min(1).describe("GitHub repository name"),
    pullNumber: z.coerce
      .number()
      .int()
      .positive()
      .describe("Pull request number"),
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

type RepoPermissionSummary = {
  access: "read" | "write" | "admin";
  pull: boolean;
  push: boolean;
  maintain: boolean;
  admin: boolean;
};

type ReviewSummary = {
  approvals: number;
  changesRequested: number;
};

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

function toAccessLabel(access?: string) {
  if (!access) return "unknown";
  return access;
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

  const explicitToken = token?.trim() ? token.trim() : undefined;
  const effectiveToken = explicitToken ?? session?.provider_token ?? undefined;
  const [mergeMethod, setMergeMethod] = useState<PullRequestMergeMethod>("merge");
  const [deleteBranch, setDeleteBranch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<
    | { htmlUrl: string; sha: string; branchDeleted: boolean }
    | null
  >(null);

  const [info, setInfo] = useState<
    PullRequestConfirmationInfo | null
  >(null);
  const [permission, setPermission] = useState<RepoPermissionSummary | null>(null);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);

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
        const result = await postJson<{
          info: PullRequestConfirmationInfo;
          permission: RepoPermissionSummary;
          reviews: ReviewSummary;
        }>("/api/github/pull-request-info", {
          owner,
          repo,
          pullNumber,
          token: effectiveToken,
        });

        if (cancelled) return;
        setInfo(result.info);
        setPermission(result.permission);
        setReviewSummary(result.reviews);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load PR info");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [effectiveToken, owner, repo, pullNumber]);

  const hasWriteAccess =
    !!permission && (permission.admin || permission.maintain || permission.push);
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
      const confirmation = await postJson<{ confirmationId: string }>(
        "/api/github/write-confirmation",
        {
          owner,
          repo,
          kind: "pull_request_merge",
        },
      );

      const mergedResult = await postJson<{
        merged: { htmlUrl: string; sha: string; branchDeleted: boolean };
      }>("/api/github/pull-request-merge", {
        owner,
        repo,
        pullNumber,
        mergeMethod,
        deleteBranch,
        confirmationId: confirmation.confirmationId,
        token: effectiveToken,
      });

      setResult({
        htmlUrl: mergedResult.merged.htmlUrl,
        sha: mergedResult.merged.sha,
        branchDeleted: mergedResult.merged.branchDeleted,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to merge pull request");
    } finally {
      setIsSubmitting(false);
    }
  }

  const checksLabel = useMemo(() => {
    if (!info?.checks) return "Checks: unknown";

    if (info.checks.totalCount === 0) {
      return "Checks: none";
    }

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
        "rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-card to-violet-500/5 p-5 space-y-5",
        "shadow-sm shadow-purple-500/5",
        className,
      )}
      {...pickSafeDomProps(props)}
    >
      <div className="space-y-1 border-b border-purple-500/10 pb-3">
        <div className="text-base font-semibold text-foreground flex items-center gap-2">
          Merge GitHub Pull Request
        </div>
        <div className="text-xs font-mono text-muted-foreground bg-purple-500/5 px-2 py-0.5 rounded-md inline-block border border-purple-500/10">
          {owner}/{repo}#{pullNumber}
        </div>
      </div>

      {info ? (
        <div className="rounded-lg border border-purple-500/20 bg-background/50 p-4 space-y-2 shadow-sm">
          <div className="text-sm font-bold text-foreground truncate">
            {info.title}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/10">
              {info.headRef} → {info.baseRef}
            </span>
            <span>•</span>
            <span className={cn(
              "px-1.5 py-0.5 rounded font-medium border",
              info.mergeable === true ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" : 
              info.mergeable === false ? "bg-red-500/10 text-red-700 border-red-500/20" : 
              "bg-muted/40 text-muted-foreground border-border"
            )}>
              {mergeableLabel}
            </span>
          </div>
          <div className="text-xs text-muted-foreground pl-0.5 border-l-2 border-purple-500/20 pl-2">
            {checksLabel}
          </div>

          {reviewSummary ? (
            <div className="text-xs text-muted-foreground pl-0.5 border-l-2 border-purple-500/20 pl-2">
              Reviews: <span className="font-medium text-foreground">{reviewSummary.approvals} approved</span>
              {reviewSummary.changesRequested
                ? <> • <span className="text-red-500 font-medium">{reviewSummary.changesRequested} changes requested</span></>
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
              className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-background/50 px-2 py-1 text-xs text-foreground hover:bg-emerald-500/20 transition-colors"
            >
              Open <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      <div className="space-y-4 pt-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            Merge method
          </label>
          <select
            value={mergeMethod}
            onChange={(e) => setMergeMethod(e.target.value as PullRequestMergeMethod)}
            className="w-full rounded-lg border border-purple-500/20 bg-background/60 px-3 py-2 text-sm text-foreground outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10 transition-all cursor-pointer hover:bg-background/80"
          >
            <option value="merge">Merge commit</option>
            <option value="squash">Squash and merge</option>
            <option value="rebase">Rebase and merge</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-xs text-muted-foreground select-none cursor-pointer group">
          <input
            type="checkbox"
            checked={deleteBranch}
            onChange={(e) => setDeleteBranch(e.target.checked)}
            className="h-4 w-4 rounded border-purple-500/30 text-purple-600 focus:ring-purple-500/30"
          />
          <span className="group-hover:text-foreground transition-colors">Delete head branch after merge (only same repo)</span>
        </label>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={handleMerge}
          disabled={!canSubmit}
          className={cn(
            "rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all",
            "hover:bg-purple-700 hover:shadow-md hover:shadow-purple-500/20",
            "active:scale-95",
            !canSubmit && "opacity-50 cursor-not-allowed hover:bg-purple-600 hover:shadow-none active:scale-100",
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
