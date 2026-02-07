"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TamboProvider } from "@tambo-ai/react";
import { ApiKeyCheck } from "@/components/ApiKeyCheck";
import { WorkspaceChat } from "@/components/workspace/WorkspaceChat";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import { WorkspaceCanvasPanel } from "@/components/workspace/WorkspaceCanvasPanel";
import { useWorkspaces, Workspace } from "@/hooks/useWorkspaces";
import { useAuth } from "@/hooks/useAuth";
import { getComponentsForRole, getToolsForRole } from "@/lib/tambo";
import { useMcpServers } from "@/components/tambo/mcp-config-modal";
import { Loader2 } from "lucide-react";

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
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
        );
    }

    // Error state
    if (error || !workspace) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
                <p className="text-red-500 mb-4">{error || "Workspace not found"}</p>
                <button
                    onClick={() => router.push("/dashboard")}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
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
    const effectiveRole =
        (workspace.role === "maintainer" || workspace.role === "both") &&
            !hasGitHubWriteAccess
            ? "contributor"
            : workspace.role;

    return (
        <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
            {/* Workspace Header */}
            <WorkspaceHeader workspace={workspace} />

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
                                "IMPORTANT: When using GitHub tools (getRepoTree, getFileContent, getRepoOverview, searchFiles, getMultipleFiles, getRepoIssues, getRepoPullRequests, getIssueComments, getRepoMaintainers), always use these credentials. For long lists, prefer rendering IssueList/PullRequestList via issuesRequest/pullRequestsRequest (do not pass tokens in component props). For ANY write actions (createRepoIssue, createRepoPullRequest, createIssueComment, setIssueAssignees, closeRepoIssue), you MUST first render the corresponding confirmation component (GitHubCreateIssue / GitHubCreatePullRequest / GitHubCreateComment / ConfirmAssignIssue / ConfirmCloseIssue) and let the user click confirm. Never call write tools directly without a real confirmationId (confirmation tokens are short-lived and single-use).",
                        }),
                    }}
                >
                    <div className="flex-1 min-h-0 overflow-hidden flex relative">
                        <WorkspaceChat
                            role={effectiveRole}
                            workspaceId={workspace.id}
                            repoName={`${workspace.repo_owner}/${workspace.repo_name}`}
                        />

                        <WorkspaceCanvasPanel role={effectiveRole} workspaceId={workspace.id} />
                    </div>
                </TamboProvider>
            </div>
        </div>
    );
}
