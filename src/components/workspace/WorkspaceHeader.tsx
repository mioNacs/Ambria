"use client";

import { Workspace } from "@/hooks/useWorkspaces";
import { ArrowLeft, ExternalLink, Star, GitBranch } from "lucide-react";
import Link from "next/link";

interface WorkspaceHeaderProps {
    workspace: Workspace;
}

const roleColors = {
    contributor: "bg-blue-100 text-blue-700",
    maintainer: "bg-purple-100 text-purple-700",
    both: "bg-emerald-100 text-emerald-700",
};

export function WorkspaceHeader({ workspace }: WorkspaceHeaderProps) {
    return (
        <header className="bg-white/80 backdrop-blur border-b border-gray-200 px-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between h-16">
                {/* Left: Back + Repo Info */}
                <div className="flex items-center gap-4 min-w-0">
                    <Link
                        href="/"
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>

                    <div className="hidden sm:flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center shadow-sm">
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
                            <div className="text-sm font-semibold text-gray-900">Ambria</div>
                            <div className="text-xs text-gray-500">Workspace</div>
                        </div>
                        <div className="h-8 w-px bg-gray-200 mx-1" />
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h1 className="font-semibold text-gray-900 truncate">
                                    {workspace.repo_owner}/{workspace.repo_name}
                                </h1>
                                <a
                                    href={workspace.repo_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                    <Star className="w-3.5 h-3.5" />
                                    {workspace.repo_stars?.toLocaleString() || 0}
                                </span>
                                {workspace.repo_language && (
                                    <span className="flex items-center gap-1">
                                        <GitBranch className="w-3.5 h-3.5" />
                                        {workspace.repo_language}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Role Badge */}
                <div className="flex items-center gap-3">
                    <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${roleColors[workspace.role]}`}
                    >
                        {workspace.role.charAt(0).toUpperCase() + workspace.role.slice(1)}
                    </span>
                </div>
            </div>
        </header>
    );
}
