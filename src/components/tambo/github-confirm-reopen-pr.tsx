"use client";

import { pickSafeDomProps } from "@/components/tambo/shared/safe-dom-props";
import { useAuth } from "@/hooks/useAuth";
import { createGitHubWriteConfirmation } from "@/lib/github-write-confirmation";
import { cn } from "@/lib/utils";
import { reopenPullRequest, createIssueComment, PullRequestConfirmationInfo } from "@/services/github-repo";
import { ExternalLink } from "lucide-react";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

export const confirmReopenPRSchema = z
  .object({
    owner: z.string().describe("GitHub repository owner/organization name"),
    repo: z.string().describe("GitHub repository name"),
    pullNumber: z.coerce.number().describe("Pull request number"),
    token: z
      .string()
      .optional()
      .describe(
        "Optional GitHub token. If omitted, the app will try to use the signed-in user's GitHub OAuth token.",
      ),
  })
  .describe(
    "A confirmation form to return a closed GitHub pull request to open state.",
  );

export type ConfirmReopenPRProps = z.infer<typeof confirmReopenPRSchema> &
  React.HTMLAttributes<HTMLDivElement>;

type RepoPermissionSummary = {
  access: "read" | "write" | "admin";
  pull: boolean;
  push: boolean;
  maintain: boolean;
  admin: boolean;
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

function ConfirmReopenPRForm({
  owner,
  repo,
  pullNumber,
  token,
  className,
  ...props
}: ConfirmReopenPRProps) {
  const { session } = useAuth();
  const explicitToken = token?.trim() ? token.trim() : undefined;
  const effectiveToken = explicitToken ?? session?.provider_token ?? undefined;
  
  const [commentBody, setCommentBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ htmlUrl: string } | null>(null);
  const [info, setInfo] = useState<PullRequestConfirmationInfo | null>(null);
  const [permission, setPermission] = useState<RepoPermissionSummary | null>(null);

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
        const result = await postJson<{
          info: PullRequestConfirmationInfo;
          permission: RepoPermissionSummary;
        }>("/api/github/pull-request-info", {
          owner,
          repo,
          pullNumber,
          token: effectiveToken,
        });

        if (cancelled) return;
        setInfo(result.info);
        setPermission(result.permission);
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
  const isPrClosed = info?.state === "closed" || info?.state === "merged"; // Though merged usually can't be reopened easily, sometimes you can revert. But let's assume filtering for "open" vs "not open".
  // Actually GitHub API docs say: "Users with push access can reopen a pull request."
  // And state must be "closed". (Merged PRs shouldn't be reopened, they should be reverted).
  // Let's stick to state != open check for disabling "already open" warning,
  // but for Reopen button, strictly speaking we usually only reopen closed ones.
  // The backend "reopenPullRequest" in github-repo check logic was "if state === open".
  
  const canSubmit = !!effectiveToken && hasWriteAccess && !isSubmitting && info?.state !== "open";

  async function handleReopen() {
    if (!canSubmit) return;
    if (!effectiveToken) {
      setError("Connect GitHub (OAuth) to reopen pull requests.");
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
          kind: "pull_request_reopen",
        },
      );
      
      const reopened = await reopenPullRequest({
        owner,
        repo,
        pullNumber,
        token: effectiveToken,
        confirmationId: confirmation.confirmationId,
      });
      
      // Handle comment posting manually since it's disjoint
      if (commentBody.trim()) {
         try {
           const commentConfirmation = await postJson<{ confirmationId: string }>(
             "/api/github/write-confirmation", 
             { owner, repo, kind: "comment" }
           );
           
           await createIssueComment({
             owner,
             repo,
             issueNumber: pullNumber, // PRs are issues
             body: commentBody,
             token: effectiveToken,
             confirmationId: commentConfirmation.confirmationId
           });
         } catch (e) {
           console.warn("Failed to post comment after reopen", e);
         }
      }

      setResult({ htmlUrl: reopened.htmlUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reopen pull request");
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
        <div className="text-base font-semibold text-foreground">
          Reopen GitHub Pull Request
        </div>
        <div className="text-xs font-mono text-muted-foreground bg-emerald-500/5 px-2 py-0.5 rounded-md inline-block border border-emerald-500/10">
          {owner}/{repo}#{pullNumber}
        </div>
      </div>

      {info ? (
        <div className="rounded-lg border border-emerald-500/20 bg-background/50 p-4 space-y-2 shadow-sm">
          <div className="text-sm font-bold text-foreground truncate">
            {info.title}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/10">
              {info.headRef} → {info.baseRef}
            </span>
            <span>•</span>
            <span className="capitalize px-1.5 py-0.5 rounded font-medium border bg-muted/40 text-muted-foreground border-border">
              {info.state}
            </span>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
          Optional comment
        </label>
        <textarea
          value={commentBody}
          onChange={(e) => setCommentBody(e.target.value)}
          className="min-h-24 w-full resize-y rounded-lg border border-emerald-500/20 bg-background/60 px-3 py-2 text-sm text-foreground outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder:text-muted-foreground/50"
          placeholder="Add a reason for reopening (Markdown supported)"
        />
      </div>

      {!effectiveToken && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
          Connect GitHub (OAuth) to reopen pull requests.
        </div>
      )}

      {effectiveToken && permission && !hasWriteAccess ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          Insufficient GitHub access: detected {toAccessLabel(permission.access)}.
          Reopening requires write or admin.
        </div>
      ) : null}

      {info && info.state === "open" && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-700 dark:text-blue-300">
            This PR is already <strong>open</strong>.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
          <div className="flex items-center justify-between gap-3">
            <span>Reopened successfully.</span>
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

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={handleReopen}
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

export function ConfirmReopenPR(props: ConfirmReopenPRProps) {
  const { owner, repo, pullNumber } = props;
  const propsKey = useMemo(
    () => [owner, repo, String(pullNumber)].join("::"),
    [owner, repo, pullNumber],
  );

  return <ConfirmReopenPRForm key={propsKey} {...props} />;
}
