"use client";

import { Workspace, useWorkspaces } from "@/hooks/useWorkspaces";
import { WorkspaceCard } from "./WorkspaceCard";
import { WorkspaceCardSkeleton } from "./WorkspaceCardSkeleton";
import { Plus, FolderGit2, Sparkles } from "lucide-react";

import { useState } from "react";
import { ConfirmationDialog } from "../ui/ConfirmationDialog";

interface WorkspaceListProps {
    workspaces: Workspace[];
    isLoading: boolean;
    onAddClick: () => void;
    onDelete?: (id: string) => Promise<void>;
}

export function WorkspaceList({
    workspaces,
    isLoading,
    onAddClick,
    onDelete,
}: WorkspaceListProps) {
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleConfirmDelete = async () => {
        if (!deletingId || !onDelete) return;
        
        try {
            setIsDeleting(true);
            await onDelete(deletingId);
            setDeletingId(null);
        } catch (error) {
            console.error("Failed to delete workspace:", error);
            // Optionally show error toast here
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <div aria-busy="true">
                <span className="sr-only" role="status" aria-live="polite">
                    Loading workspaces…
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {[...Array(6)].map((_, i) => (
                        <WorkspaceCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        );
    }

    if (workspaces.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 px-4 animate-fade-in-up">
                {/* Icon with gradient background */}
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-3xl blur-2xl opacity-20 animate-pulse" />
                    <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-50 to-blue-50 border border-gray-200 flex items-center justify-center shadow-xl">
                        <FolderGit2 className="w-12 h-12 text-gray-700" />
                        <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-amber-500 animate-bounce" style={{ animationDelay: '0.5s' }} />
                    </div>
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-3 text-center">
                    Welcome to Your Workspaces
                </h3>
                <p className="text-gray-600 text-center mb-8 max-w-md leading-relaxed">
                    Start by adding a GitHub repository. You&apos;ll be able to chat with AI about issues, pull requests, and collaborate more effectively.
                </p>
                
                {/* Features list */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 max-w-2xl">
                    {[
                        { icon: "🤖", text: "AI-Powered Chat" },
                        { icon: "🔍", text: "Smart Analysis" },
                        { icon: "⚡", text: "Quick Actions" },
                    ].map((feature, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 shadow-sm"
                            style={{ animationDelay: `${i * 0.1}s` }}
                        >
                            <span className="text-2xl">{feature.icon}</span>
                            <span className="text-sm font-medium text-gray-700">{feature.text}</span>
                        </div>
                    ))}
                </div>
                
                <button
                    onClick={onAddClick}
                    className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50"
                >
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                    Add Your First Workspace
                </button>
            </div>
        );
    }

    return (
        <>
            {/* Header with count */}
            <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Your Workspaces
                    </h2>
                    <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                        {workspaces.length}
                    </span>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {workspaces.map((workspace, index) => (
                    <div
                        key={workspace.id}
                        className="animate-fade-in-up opacity-0"
                        style={{ 
                            animationDelay: `${index * 0.05}s`, 
                            animationFillMode: 'forwards' 
                        }}
                    >
                        <WorkspaceCard
                            workspace={workspace}
                            onDelete={(id) => setDeletingId(id)}
                        />
                    </div>
                ))}
            </div>

            <ConfirmationDialog
                isOpen={!!deletingId}
                title="Delete Workspace?"
                description="This will remove the workspace from Ambria. This action cannot be undone, but it won't affect the GitHub repository itself."
                confirmLabel="Delete Workspace"
                isDestructive
                isLoading={isDeleting}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeletingId(null)}
            />
        </>
    );
}
