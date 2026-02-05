"use client";

import { Workspace } from "@/hooks/useWorkspaces";
import { Star, Code2, Trash2, ArrowUpRight } from "lucide-react";
import Link from "next/link";

interface WorkspaceCardProps {
    workspace: Workspace;
    onDelete?: (id: string) => void;
}

const roleColors = {
    contributor: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    maintainer: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    both: "bg-gradient-to-r from-violet-500/20 to-cyan-500/20 text-white border-violet-500/30",
};

const accessBadgeColors = {
    read: "bg-gray-500/20 text-gray-400",
    write: "bg-amber-500/20 text-amber-300",
    admin: "bg-rose-500/20 text-rose-300",
};

export function WorkspaceCard({ workspace, onDelete }: WorkspaceCardProps) {
    const handleDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onDelete && confirm("Are you sure you want to delete this workspace?")) {
            onDelete(workspace.id);
        }
    };

    return (
        <Link
            href={`/workspace/${workspace.id}`}
            className="block group"
        >
            <div className="glass-dark rounded-2xl border border-violet-500/10 p-6 hover:border-violet-500/30 transition-all duration-300 card-hover relative overflow-hidden">
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Header */}
                <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-white truncate group-hover:text-violet-300 transition-colors flex items-center gap-2">
                            {workspace.repo_name}
                            <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
                        </h3>
                        <p className="text-sm text-gray-500 truncate">
                            {workspace.repo_owner}
                        </p>
                    </div>
                    <button
                        onClick={handleDelete}
                        className="p-2 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Delete workspace"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                {/* Description */}
                {workspace.repo_description && (
                    <p className="text-sm text-gray-400 line-clamp-2 mb-4 relative z-10">
                        {workspace.repo_description}
                    </p>
                )}

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-4 relative z-10">
                    <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${roleColors[workspace.role]}`}
                    >
                        {workspace.role.charAt(0).toUpperCase() + workspace.role.slice(1)}
                    </span>
                    <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${accessBadgeColors[workspace.detected_access]}`}
                    >
                        {workspace.detected_access}
                    </span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-500 relative z-10">
                    <div className="flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-amber-400" />
                        <span>{workspace.repo_stars?.toLocaleString() || 0}</span>
                    </div>
                    {workspace.repo_language && (
                        <div className="flex items-center gap-1.5">
                            <Code2 className="w-4 h-4 text-violet-400" />
                            <span>{workspace.repo_language}</span>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
}
