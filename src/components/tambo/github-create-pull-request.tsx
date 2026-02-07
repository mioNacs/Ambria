"use client";

import { pickSafeDomProps } from "@/components/tambo/shared/safe-dom-props";
import { useAuth } from "@/hooks/useAuth";
import { createGitHubWriteConfirmation } from "@/lib/github-write-confirmation";
import { cn } from "@/lib/utils";
import { createRepoPullRequest } from "@/services/github-repo";
import { ExternalLink } from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import { z } from "zod";

export const githubCreatePullRequestSchema = z
  .object({
    owner: z.string().describe("GitHub repository owner/organization name"),
    repo: z.string().describe("GitHub repository name"),
    title: z.string().describe("Pull request title"),
    body: z
      .string()
      .optional()
      .describe("Pull request description (GitHub-flavored Markdown)"),
    head: z
      .string()
      .describe(
        "The name of the branch where your changes are implemented (e.g., 'feature/my-branch' or 'owner:branch')",
      ),
    base: z
      .string()
      .describe("The name of the branch you want to merge into (e.g., 'main')"),
    draft: z.boolean().optional().describe("Whether to create the PR as a draft"),
    maintainerCanModify: z
      .boolean()
      .optional()
      .describe("Whether maintainers can push to the PR branch"),
    token: z
      .string()
      .optional()
      .describe(
        "Optional GitHub token. If omitted, the app will try to use the signed-in user's GitHub OAuth token.",
      ),
  })
  .describe(
    "A form that previews and creates a GitHub pull request after the user confirms.",
  );

export type GitHubCreatePullRequestProps = z.infer<
  typeof githubCreatePullRequestSchema
> &
  React.HTMLAttributes<HTMLDivElement>;

function safeTrim(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function GitHubCreatePullRequestForm({
  owner,
  repo,
  title,
  body,
  head,
  base,
  draft,
  maintainerCanModify,
  token,
  createdPullRequest,
  setCreatedPullRequest,
  className,
  ...props
}: GitHubCreatePullRequestProps & {
  createdPullRequest: { htmlUrl: string; number: number } | null;
  setCreatedPullRequest: (value: { htmlUrl: string; number: number } | null) => void;
}) {
  const { session } = useAuth();

  const [prTitle, setPrTitle] = useState<string>(() => title ?? "");
  const [prBody, setPrBody] = useState(body ?? "");
  const [prHead, setPrHead] = useState<string>(() => head ?? "");
  const [prBase, setPrBase] = useState<string>(() => base ?? "");
  const [isDraft, setIsDraft] = useState(draft ?? false);
  const [canModify, setCanModify] = useState(maintainerCanModify ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveToken = token ?? session?.provider_token ?? undefined;
  const trimmedTitle = safeTrim(prTitle);
  const trimmedHead = safeTrim(prHead);
  const trimmedBase = safeTrim(prBase);
  const trimmedBody = safeTrim(prBody);
  const canSubmit =
    !!trimmedTitle &&
    !!trimmedHead &&
    !!trimmedBase &&
    !!effectiveToken &&
    !isSubmitting;

  async function handleCreate() {
    if (!canSubmit) return;
    if (!effectiveToken) {
      setError("Connect GitHub (OAuth) to create pull requests.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setCreatedPullRequest(null);

    try {
      const confirmationId = createGitHubWriteConfirmation({
        owner,
        repo,
        kind: "pull_request",
      });
      const created = await createRepoPullRequest({
        owner,
        repo,
        title: trimmedTitle,
        body: trimmedBody ? trimmedBody : undefined,
        head: trimmedHead,
        base: trimmedBase,
        draft: isDraft,
        maintainerCanModify: canModify,
        token: effectiveToken,
        confirmationId,
      });

      setCreatedPullRequest({ htmlUrl: created.htmlUrl, number: created.number });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create pull request",
      );
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
          Create GitHub Pull Request
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
            value={prTitle}
            onChange={(e) => setPrTitle(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/30"
            placeholder="PR title"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Head branch
            </label>
            <input
              value={prHead}
              onChange={(e) => setPrHead(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/30"
              placeholder="feature/my-branch"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Base branch
            </label>
            <input
              value={prBase}
              onChange={(e) => setPrBase(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/30"
              placeholder="main"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Description
          </label>
          <textarea
            value={prBody}
            onChange={(e) => setPrBody(e.target.value)}
            className="min-h-28 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/30"
            placeholder="Describe the changes (Markdown supported)"
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={isDraft}
              onChange={(e) => setIsDraft(e.target.checked)}
              className="h-4 w-4 rounded border border-border"
            />
            Create as draft
          </label>

          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={canModify}
              onChange={(e) => setCanModify(e.target.checked)}
              className="h-4 w-4 rounded border border-border"
            />
            Maintainers can modify
          </label>
        </div>
      </div>

      {!effectiveToken && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
          Connect GitHub (OAuth) to create pull requests.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      {createdPullRequest && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
          <div className="flex items-center justify-between gap-3">
            <span>
              Pull request #{createdPullRequest.number} created successfully.
            </span>
            <a
              href={createdPullRequest.htmlUrl}
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

export function GitHubCreatePullRequest(props: GitHubCreatePullRequestProps) {
  const {
    owner,
    repo,
    title,
    body,
    head,
    base,
    draft,
    maintainerCanModify,
  } = props;
  const propsKey = useMemo(
    () =>
      [
        owner,
        repo,
        title,
        body ?? "",
        head,
        base,
        String(draft ?? false),
        String(maintainerCanModify ?? true),
      ].join("::"),
    [base, body, draft, head, maintainerCanModify, owner, repo, title],
  );

  const [createdPullRequestState, setCreatedPullRequestState] = useState<
    { key: string; value: { htmlUrl: string; number: number } | null }
  >(() => ({ key: propsKey, value: null }));
  const createdPullRequest =
    createdPullRequestState.key === propsKey
      ? createdPullRequestState.value
      : null;
  const setCreatedPullRequest = (
    value: { htmlUrl: string; number: number } | null,
  ) => {
    setCreatedPullRequestState({ key: propsKey, value });
  };

  return (
    <GitHubCreatePullRequestForm
      key={propsKey}
      {...props}
      createdPullRequest={createdPullRequest}
      setCreatedPullRequest={setCreatedPullRequest}
    />
  );
}
