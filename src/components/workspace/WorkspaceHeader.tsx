"use client";

import { Workspace } from "@/hooks/useWorkspaces";
import { ArrowLeft, ExternalLink, Star, GitBranch } from "lucide-react";
import Link from "next/link";
import { Logo } from "../ui/Logo";

interface WorkspaceHeaderProps {
    workspace: Workspace;
}

const roleColors = {
    contributor: "bg-blue-50 text-blue-700 border-blue-700 ",
    maintainer: "bg-purple-50 text-purple-700 border-purple-700",
    both: "bg-emerald-50 text-emerald-700 border-emerald-700",
};

export function WorkspaceHeader({ workspace }: WorkspaceHeaderProps) {
    return (
        <header className="bg-white/80 backdrop-blur border-b-2 border-gray-700 px-4">
            <div className="flex items-center justify-between h-16">
                {/* Left: Back + Repo Info */}
                <div className="flex items-center gap-4 min-w-0">
                    <Link
                        href="/dashboard"
                        className="p-2 text-gray-400 border-2 border-transparent hover:border-gray-700 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>

                    <div className="hidden sm:flex items-center gap-3">
                        <Logo className="w-10 h-10 text-gray-900" />
                        <div className="leading-tight">
                            <div className="text-sm font-semibold text-gray-900">Ambria</div>
                            <div className="text-xs text-gray-500">Workspace</div>
                        </div>
                        <div className="h-8 w-[2px] bg-gray-900 mx-1" />
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h1 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
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
                            <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                    <Star className="w-3.5 h-3.5" />
                                    {workspace.repo_stars?.toLocaleString() || 0}
                                </span>
                                {workspace.repo_language && (
                                    <span className="hidden sm:flex items-center gap-1">
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
                        className={`inline-flex items-center px-2.5 font-semibold sm:px-3 py-1 rounded-full text-xs font-medium border-2 ${roleColors[workspace.role]}`}
                    >
                        {workspace.role.charAt(0).toUpperCase() + workspace.role.slice(1)}
                    </span>
                </div>
            </div>
        </header>
    );
}
