"use client";

import { Workspace, useWorkspaces } from "@/hooks/useWorkspaces";
import { WorkspaceCard } from "./WorkspaceCard";
import { Plus, FolderGit2 } from "lucide-react";

interface WorkspaceListProps {
    workspaces: Workspace[];
    isLoading: boolean;
    onAddClick: () => void;
}

export function WorkspaceList({
    workspaces,
    isLoading,
    onAddClick,
}: WorkspaceListProps) {
    const { deleteWorkspace } = useWorkspaces();

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                    <div
                        key={i}
                        className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse"
                    >
                        <div className="h-5 bg-gray-200 rounded w-2/3 mb-3" />
                        <div className="h-4 bg-gray-100 rounded w-1/3 mb-4" />
                        <div className="h-12 bg-gray-100 rounded mb-4" />
                        <div className="flex gap-2">
                            <div className="h-6 bg-gray-100 rounded-full w-20" />
                            <div className="h-6 bg-gray-100 rounded-full w-16" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (workspaces.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-4 animate-fade-in-up">
                <div className="w-20 h-20 rounded-2xl bg-white border border-gray-200 flex items-center justify-center mb-6 shadow-sm">
                    <FolderGit2 className="w-10 h-10 text-gray-700" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No workspaces yet
                </h3>
                <p className="text-gray-600 text-center mb-8 max-w-md">
                    Add a GitHub repository to start chatting with AI about issues, PRs,
                    and contributions.
                </p>
                <button
                    onClick={onAddClick}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50"
                >
                    <Plus className="w-5 h-5" />
                    Add Your First Workspace
                </button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((workspace, index) => (
                <div
                    key={workspace.id}
                    className="animate-fade-in-up opacity-0"
                    style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'forwards' }}
                >
                    <WorkspaceCard
                        workspace={workspace}
                        onDelete={deleteWorkspace}
                    />
                </div>
            ))}
        </div>
    );
}
