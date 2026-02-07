"use client";

import { pickSafeDomProps } from "@/components/tambo/shared/safe-dom-props";
import { chatRenderableStyles } from "@/components/tambo/shared/chat-renderable-styles";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type { PullRequestConfirmationInfo } from "@/services/github-repo";
import { ExternalLink } from "lucide-react";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

export const confirmClosePRSchema = z
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
    "A confirmation form to close a GitHub pull request. Optionally posts a comment first, then closes after the user clicks confirm.",
  );

export type ConfirmClosePRProps = z.infer<typeof confirmClosePRSchema> &
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

  const explicitToken = token?.trim() ? token.trim() : undefined;
  const effectiveToken = explicitToken ?? session?.provider_token ?? undefined;
  const [commentBody, setCommentBody] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ htmlUrl: string } | null>(null);
  const [info, setInfo] = useState<
    PullRequestConfirmationInfo | null
  >(null);
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
        const commentConfirmation = await postJson<{ confirmationId: string }>(
          "/api/github/write-confirmation",
          {
            owner,
            repo,
            kind: "comment",
          },
        );

        await postJson("/api/github/issue-comment", {
          owner,
          repo,
          issueNumber: pullNumber,
          body: trimmedComment,
          confirmationId: commentConfirmation.confirmationId,
          token: effectiveToken,
        });
      }

      const closeConfirmation = await postJson<{ confirmationId: string }>(
        "/api/github/write-confirmation",
        {
          owner,
          repo,
          kind: "pull_request_close",
        },
      );

      const closedResult = await postJson<{ closed: { htmlUrl: string } }>(
        "/api/github/pull-request-close",
        {
          owner,
          repo,
          pullNumber,
          confirmationId: closeConfirmation.confirmationId,
          token: effectiveToken,
        },
      );

      setResult({ htmlUrl: closedResult.closed.htmlUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close pull request");
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
          Close GitHub Pull Request
        </div>
        <div className={chatRenderableStyles.kicker}>
          {owner}/{repo}#{pullNumber}
        </div>
      </div>

      {info ? (
        <div className={chatRenderableStyles.section}>
          <div className="space-y-2">
            <div className="truncate text-sm font-semibold text-foreground">
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
        </div>
      ) : null}

      <div className="space-y-1">
        <label className={chatRenderableStyles.sectionTitle}>Optional comment</label>
        <textarea
          value={commentBody}
          onChange={(e) => setCommentBody(e.target.value)}
          className={cn(chatRenderableStyles.textarea, "min-h-24")}
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
          onClick={handleClose}
          disabled={!canSubmit}
          className={chatRenderableStyles.buttonPrimary}
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
