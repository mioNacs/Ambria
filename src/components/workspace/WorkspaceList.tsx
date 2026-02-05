"use client";

import { Workspace, useWorkspaces } from "@/hooks/useWorkspaces";
import { WorkspaceCard } from "./WorkspaceCard";
import { Plus, FolderGit2, Sparkles } from "lucide-react";

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
                        className="glass-dark rounded-2xl border border-violet-500/10 p-6 animate-pulse"
                    >
                        <div className="h-5 bg-violet-500/20 rounded w-2/3 mb-3" />
                        <div className="h-4 bg-gray-700/50 rounded w-1/3 mb-4" />
                        <div className="h-12 bg-gray-700/30 rounded mb-4" />
                        <div className="flex gap-2">
                            <div className="h-6 bg-violet-500/20 rounded-full w-20" />
                            <div className="h-6 bg-cyan-500/20 rounded-full w-16" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (workspaces.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-4 animate-fade-in-up">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center mb-6 animate-float">
                    <FolderGit2 className="w-10 h-10 text-violet-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                    No workspaces yet
                    <Sparkles className="w-5 h-5 text-violet-400" />
                </h3>
                <p className="text-gray-400 text-center mb-8 max-w-md">
                    Add a GitHub repository to start chatting with AI about issues, PRs,
                    and contributions.
                </p>
                <button
                    onClick={onAddClick}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02]"
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
