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
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className="relative bg-white rounded-2xl border border-gray-200 overflow-hidden"
                        style={{ animationDelay: `${i * 0.1}s` }}
                    >
                        {/* Gradient accent */}
                        <div className="h-1.5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer" />
                        
                        <div className="p-6">
                            {/* Header skeleton */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <div className="h-5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg w-2/3 mb-2 animate-shimmer" />
                                    <div className="h-4 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-lg w-1/3 animate-shimmer" style={{ animationDelay: '0.1s' }} />
                                </div>
                            </div>
                            
                            {/* Description skeleton */}
                            <div className="space-y-2 mb-4">
                                <div className="h-3 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-lg animate-shimmer" style={{ animationDelay: '0.2s' }} />
                                <div className="h-3 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-lg w-4/5 animate-shimmer" style={{ animationDelay: '0.3s' }} />
                            </div>
                            
                            {/* Badge skeleton */}
                            <div className="h-7 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-full w-24 mb-4 animate-shimmer" style={{ animationDelay: '0.4s' }} />
                            
                            {/* Stats skeleton */}
                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                <div className="flex gap-4">
                                    <div className="h-4 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-lg w-12 animate-shimmer" style={{ animationDelay: '0.5s' }} />
                                    <div className="h-4 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-lg w-16 animate-shimmer" style={{ animationDelay: '0.6s' }} />
                                </div>
                                <div className="h-4 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded-lg w-12 animate-shimmer" style={{ animationDelay: '0.7s' }} />
                            </div>
                        </div>
                    </div>
                ))}
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
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Your Workspaces
                    </h2>
                    <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                        {workspaces.length}
                    </span>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                            onDelete={deleteWorkspace}
                        />
                    </div>
                ))}
            </div>
        </>
    );
}
