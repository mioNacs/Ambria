"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { UserMenu } from "@/components/auth/UserMenu";
import { WorkspaceList } from "@/components/workspace/WorkspaceList";
import { AddWorkspaceModal } from "@/components/workspace/AddWorkspaceModal";
import { AskAmbriaWidget } from "@/components/ask-ambria/AskAmbriaWidget";

export default function Dashboard() {
  const router = useRouter();
  const { user, session, isLoading: authLoading } = useAuth();
  const { workspaces, isLoading: workspacesLoading, refetch } = useWorkspaces();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const authProvider = user?.app_metadata?.provider;
  const linkedProviders = Array.isArray(user?.app_metadata?.providers)
    ? user.app_metadata.providers
    : [];
  const linkedProvidersLabel = linkedProviders.join(",");
  const hasGitHubLink =
    authProvider === "github" || linkedProviders.includes("github");

  // Supabase exposes `provider_token` for the current OAuth provider.
  // We only forward it to GitHub APIs when the user is linked to GitHub.
  const sessionProviderToken = session?.provider_token ?? undefined;
  const githubToken = hasGitHubLink ? sessionProviderToken : undefined;

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (!sessionProviderToken) return;
    if (hasGitHubLink) return;
    if (!authProvider && linkedProvidersLabel.length === 0) return;

    console.warn(
      `Dashboard: provider_token present but no GitHub provider is linked (authProvider='${authProvider}', linkedProviders='${linkedProvidersLabel}'). GitHub search will run unauthenticated.`,
    );
  }, [authProvider, hasGitHubLink, linkedProvidersLabel, sessionProviderToken]);

  const askAmbriaContextKey = user?.id
    ? `ask-ambria-dashboard:${user.id}`
    : "ask-ambria-dashboard";

  // Redirect to landing if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [authLoading, user, router]);

  // Show loading while checking auth
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
          <span className="text-sm">Checking your session…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center shadow-sm">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4"
                  />
                </svg>
              </div>
              <div className="leading-tight">
                <div className="text-lg font-semibold text-gray-900">Ambria</div>
                <div className="text-xs text-gray-500 hidden sm:block">
                  AI companion for open source work
                </div>
              </div>
            </div>

            {/* User Menu */}
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-start sm:items-center justify-between gap-4 mb-8 animate-fade-in-up">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
              Workspaces
            </h1>
            <p className="text-gray-600 mt-2 max-w-2xl">
              Connect repositories and chat with AI about issues, pull requests, and
              contributions.
            </p>
          </div>
          {workspaces.length > 0 && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50"
            >
              <Plus className="w-5 h-5" />
              Add Workspace
            </button>
          )}
        </div>

        {/* Workspace List */}
        <WorkspaceList
          workspaces={workspaces}
          isLoading={workspacesLoading}
          onAddClick={() => setIsAddModalOpen(true)}
        />
      </main>

      {/* Add Workspace Modal */}
      <AddWorkspaceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={refetch}
      />

      <AskAmbriaWidget
        contextKey={askAmbriaContextKey}
        githubToken={githubToken}
      />
    </div>
  );
}
