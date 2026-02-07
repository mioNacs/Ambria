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

function safeTrim(value: string | null | undefined) {
  if (value == null) return "";
  return value.trim();
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
        "w-full rounded-xl overflow-hidden bg-gradient-to-br from-purple-500/5 via-card to-pink-500/5",
        "border border-purple-500/50",
        "shadow-sm shadow-purple-500/5 dark:shadow-purple-500/10",
        className,
      )}
      {...pickSafeDomProps(props)}
    >
      <div className="relative px-4 py-3 border-b border-purple-500/20 bg-muted/30 flex items-center justify-between gap-4">
         <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-git-pull-request"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" x2="6" y1="9" y2="21"/></svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground tracking-tight">
              Create GitHub Pull Request
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">
              {owner}/{repo}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground ml-0.5">
            Title
          </label>
          <input
            value={prTitle}
            onChange={(e) => setPrTitle(e.target.value)}
            className="w-full rounded-lg border border-purple-500/30 bg-muted/10 px-3 py-2 text-sm text-foreground outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all placeholder:text-muted-foreground/50"
            placeholder="PR title"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground ml-0.5">
              Head branch
            </label>
            <input
              value={prHead}
              onChange={(e) => setPrHead(e.target.value)}
              className="w-full rounded-lg border border-purple-500/30 bg-muted/10 px-3 py-2 text-sm text-foreground outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all placeholder:text-muted-foreground/50 font-mono text-xs"
              placeholder="feature/my-branch"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground ml-0.5">
              Base branch
            </label>
            <input
              value={prBase}
              onChange={(e) => setPrBase(e.target.value)}
              className="w-full rounded-lg border border-purple-500/30 bg-muted/10 px-3 py-2 text-sm text-foreground outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all placeholder:text-muted-foreground/50 font-mono text-xs"
              placeholder="main"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground ml-0.5">
            Description
          </label>
          <textarea
            value={prBody}
            onChange={(e) => setPrBody(e.target.value)}
            className="min-h-28 w-full resize-y rounded-lg border border-purple-500/30 bg-muted/10 px-3 py-2 text-sm text-foreground outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all placeholder:text-muted-foreground/50"
            placeholder="Describe the changes (Markdown supported)"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer group">
            <input
              type="checkbox"
              checked={isDraft}
              onChange={(e) => setIsDraft(e.target.checked)}
              className="h-4 w-4 rounded border border-muted-foreground/30 text-purple-600 focus:ring-purple-500/50 group-hover:border-purple-500 transition-colors cursor-pointer bg-muted/10"
            />
            <span className="group-hover:text-foreground transition-colors">Create as draft</span>
          </label>

          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer group">
            <input
              type="checkbox"
              checked={canModify}
              onChange={(e) => setCanModify(e.target.checked)}
              className="h-4 w-4 rounded border border-muted-foreground/30 text-purple-600 focus:ring-purple-500/50 group-hover:border-purple-500 transition-colors cursor-pointer bg-muted/10"
            />
            <span className="group-hover:text-foreground transition-colors">Maintainers can modify</span>
          </label>
        </div>
      </div>

      {!effectiveToken && (
        <div className="mx-4 mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-triangle shrink-0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            Connect GitHub (OAuth) to create pull requests.
        </div>
      )}

      {error && (
        <div className="mx-4 mb-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive flex items-center gap-2">
             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x-circle shrink-0"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
            {error}
        </div>
      )}

      {createdPullRequest && (
        <div className="mx-4 mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-700 dark:text-emerald-400">
           <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle-2 shrink-0"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                Pull request #{createdPullRequest.number} created successfully.
              </span>
            <a
              href={createdPullRequest.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-500/20 transition-colors"
            >
              Open <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 p-4 pt-0">
        <button
          type="button"
          onClick={handleCreate}
          disabled={!canSubmit}
          className={cn(
             "rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-purple-500/20 transition-all hover:shadow-lg hover:shadow-purple-500/30 hover:brightness-110 active:scale-[0.98]",
            !canSubmit && "opacity-50 cursor-not-allowed grayscale shadow-none",
          )}
        >
          {isSubmitting ? (
             <span className="flex items-center gap-2">
                <svg className="animate-spin h-3.5 w-3.5 text-white/80" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
             </span>
          ) : "Confirm & create"}
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
