"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TamboProvider } from "@tambo-ai/react";
import { ApiKeyCheck } from "@/components/ApiKeyCheck";
import { WorkspaceChat } from "@/components/workspace/WorkspaceChat";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import { WorkspaceCanvasPanel } from "@/components/workspace/WorkspaceCanvasPanel";
import { WorkspacePageSkeleton } from "@/components/workspace/WorkspacePageSkeleton";
import { useWorkspaces, Workspace } from "@/hooks/useWorkspaces";
import { useAuth } from "@/hooks/useAuth";
import { getComponentsForRole, getToolsForRole } from "@/lib/tambo";
import { useMcpServers } from "@/components/tambo/mcp-config-modal";
import { cn } from "@/lib/utils";
import { WorkspaceThreadHistory } from "@/components/workspace/WorkspaceThreadHistory";

export default function WorkspacePage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;

    const { session, isLoading: authLoading } = useAuth();
    const { getWorkspace } = useWorkspaces();
    const mcpServers = useMcpServers();
    const apiKey = process.env.NEXT_PUBLIC_TAMBO_API_KEY;

    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mobileView, setMobileView] = useState<"chat" | "board">("chat");
    const [isThreadDrawerOpen, setIsThreadDrawerOpen] = useState(false);

    useEffect(() => {
        async function loadWorkspace() {
            if (!workspaceId) return;

            try {
                setIsLoading(true);
                const ws = await getWorkspace(workspaceId);
                if (!ws) {
                    setError("Workspace not found");
                    return;
                }
                setWorkspace(ws);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load workspace");
            } finally {
                setIsLoading(false);
            }
        }

        if (!authLoading) {
            loadWorkspace();
        }
    }, [workspaceId, authLoading, getWorkspace]);

    // Loading state
    if (authLoading || isLoading) {
        return <WorkspacePageSkeleton />;
    }

    // Error state
    if (error || !workspace) {
        return (
            <div className="min-h-screen bg-green-50/50 flex flex-col items-center justify-center">
                <p className="text-red-500 mb-4" role="alert">
                    {error || "Workspace not found"}
                </p>
                <button
                    onClick={() => router.push("/dashboard")}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50"
                >
                    Go to Dashboard
                </button>
            </div>
        );
    }

    if (!apiKey) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <ApiKeyCheck />
            </div>
        );
    }

    const hasGitHubWriteAccess =
        !!session?.provider_token && workspace.detected_access !== "read";

    const configuredRole =
        workspace.role === "contributor" ||
        workspace.role === "maintainer" ||
        workspace.role === "both"
            ? workspace.role
            : "contributor";

    const effectiveRole =
        (configuredRole === "maintainer" || configuredRole === "both") &&
            !hasGitHubWriteAccess
            ? "contributor"
            : configuredRole;

    return (
        <div className="h-dvh bg-green-50/50 flex flex-col overflow-hidden">
            {/* Workspace Header */}
            <WorkspaceHeader workspace={workspace} />

            {/* Mobile toolbar */}
            <div className="lg:hidden border-b border-gray-200 bg-white/80 backdrop-blur">
                <div className="flex items-center gap-3 px-4 py-2">
                    <button
                        type="button"
                        onClick={() => setIsThreadDrawerOpen(true)}
                        className="px-3 py-2 text-sm font-medium rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 transition-colors"
                    >
                        Threads
                    </button>

                    <div className="flex-1" />

                    <div className="inline-flex items-center rounded-xl bg-gray-100 p-1">
                        <button
                            type="button"
                            onClick={() => setMobileView("chat")}
                            className={cn(
                                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                                mobileView === "chat"
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-600 hover:text-gray-900",
                            )}
                        >
                            Chat
                        </button>
                        <button
                            type="button"
                            onClick={() => setMobileView("board")}
                            className={cn(
                                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                                mobileView === "board"
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-600 hover:text-gray-900",
                            )}
                        >
                            Board
                        </button>
                    </div>
                </div>
            </div>

            {/* Chat Interface */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <TamboProvider
                    apiKey={apiKey}
                    components={getComponentsForRole(effectiveRole)}
                    tools={getToolsForRole(effectiveRole)}
                    tamboUrl={process.env.NEXT_PUBLIC_TAMBO_URL}
                    mcpServers={mcpServers}
                    userToken={session?.access_token}
                    contextHelpers={{
                        workspace_context: () => ({
                            repository: `${workspace.repo_owner}/${workspace.repo_name}`,
                            url: workspace.repo_url,
                            description: workspace.repo_description || "",
                            language: workspace.repo_language || "",
                            stars: workspace.repo_stars || 0,
                            configuredUserRole: workspace.role,
                            userRole: effectiveRole,
                            detectedAccess: workspace.detected_access,
                            hasWriteAccess: hasGitHubWriteAccess,
                            roleDescription:
                                effectiveRole === "contributor"
                                    ? workspace.role === "contributor"
                                        ? "As a contributor, help them find good first issues, understand the codebase, and prepare contributions."
                                        : "Maintainer tools are disabled because GitHub write access is missing. Explain that write access is required for maintainer actions (assign/close issues, create issues/PRs/comments)."
                                    : effectiveRole === "maintainer"
                                        ? "As a maintainer, help them triage issues, review PRs, and manage the project."
                                        : "As both contributor and maintainer, provide full assistance for contributing and maintaining the project.",
                        }),
                        github_credentials: () => ({
                            owner: workspace.repo_owner,
                            repo: workspace.repo_name,
                            token: session?.provider_token ?? undefined,
                            instructions:
                                "IMPORTANT: When using GitHub tools (getRepoTree, getFileContent, getRepoOverview, searchFiles, getMultipleFiles, getRepoIssues, getRepoPullRequests, getIssueComments, getRepoMaintainers), always use these credentials. For long lists, prefer rendering IssueList/PullRequestList via issuesRequest/pullRequestsRequest (do not pass tokens in component props). For ANY write actions (createRepoIssue, createRepoPullRequest, createIssueComment, setIssueAssignees, closeRepoIssue, mergePullRequest, closePullRequest), you MUST first render the corresponding confirmation component (GitHubCreateIssue / GitHubCreatePullRequest / GitHubCreateComment / ConfirmAssignIssue / ConfirmCloseIssue / ConfirmMergePR / ConfirmClosePR) and let the user click confirm. Never call write tools directly without a real confirmationId (confirmation tokens are short-lived and single-use).",
                        }),
                    }}
                >
                    <div className="flex-1 min-h-0 overflow-hidden flex flex-col lg:flex-row relative">
                        <div
                            className={cn(
                                "flex-1 min-h-0 overflow-hidden",
                                mobileView === "chat" ? "flex" : "hidden",
                                "lg:flex",
                            )}
                        >
                            <WorkspaceChat
                                role={effectiveRole}
                                workspaceId={workspace.id}
                                repoName={`${workspace.repo_owner}/${workspace.repo_name}`}
                            />
                        </div>

                        <div
                            className={cn(
                                "flex-1 min-h-0 overflow-hidden",
                                mobileView === "board" ? "flex" : "hidden",
                                "lg:flex lg:flex-none",
                            )}
                        >
                            <WorkspaceCanvasPanel role={effectiveRole} workspaceId={workspace.id} />
                        </div>
                    </div>

                    {isThreadDrawerOpen ? (
                        <div className="fixed inset-0 z-[60] lg:hidden">
                            <button
                                type="button"
                                className="absolute inset-0 bg-black/40"
                                onClick={() => setIsThreadDrawerOpen(false)}
                                aria-label="Close threads"
                            />
                            <div
                                className="absolute inset-y-0 left-0 w-[min(24rem,90vw)] bg-white shadow-xl"
                                role="dialog"
                                aria-modal="true"
                                aria-label="Threads"
                            >
                                <WorkspaceThreadHistory
                                    workspaceId={workspace.id}
                                    position="left"
                                    mode="overlay"
                                    onClose={() => setIsThreadDrawerOpen(false)}
                                />
                            </div>
                        </div>
                    ) : null}
                </TamboProvider>
            </div>
        </div>
    );
}
