"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { UserMenu } from "@/components/auth/UserMenu";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { WorkspaceList } from "@/components/workspace/WorkspaceList";
import { AddWorkspaceModal } from "@/components/workspace/AddWorkspaceModal";

export default function Dashboard() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const {
    workspaces,
    isLoading: workspacesLoading,
    error: workspacesError,
    refetch,
  } = useWorkspaces();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Redirect to landing if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [authLoading, user, router]);

  // Show loading while checking auth
  if (authLoading || !user) {
    return <DashboardSkeleton label="Checking your session…" />;
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
        {workspacesError ? (
          <div
            className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-5 text-rose-900"
            role="alert"
          >
            <div className="text-sm font-semibold">Couldn’t load workspaces</div>
            <div className="mt-1 text-sm text-rose-800">Please try again.</div>
            {process.env.NODE_ENV !== "production" &&
            workspacesError.message.trim() ? (
              <div className="mt-1 text-xs text-rose-900/80">
                Details: {workspacesError.message.trim()}
              </div>
            ) : null}
            <button
              type="button"
              onClick={refetch}
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50"
            >
              Retry
            </button>
          </div>
        ) : (
          <WorkspaceList
            workspaces={workspaces}
            isLoading={workspacesLoading}
            onAddClick={() => setIsAddModalOpen(true)}
          />
        )}
      </main>

      {/* Add Workspace Modal */}
      <AddWorkspaceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={refetch}
      />
    </div>
  );
}
