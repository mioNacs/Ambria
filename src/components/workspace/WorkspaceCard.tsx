"use client";

import { Workspace } from "@/hooks/useWorkspaces";
import { Star, Code2, Trash2, ArrowUpRight } from "lucide-react";
import Link from "next/link";

interface WorkspaceCardProps {
    workspace: Workspace;
    onDelete?: (id: string) => void;
}

const roleColors = {
    contributor: "bg-emerald-50 text-emerald-800 border-emerald-200",
    maintainer: "bg-amber-50 text-amber-900 border-amber-200",
    both: "bg-gray-100 text-gray-900 border-gray-200",
};

const accessBadgeColors = {
    read: "bg-gray-100 text-gray-700",
    write: "bg-emerald-50 text-emerald-800",
    admin: "bg-rose-50 text-rose-800",
};

export function WorkspaceCard({ workspace, onDelete }: WorkspaceCardProps) {
    const confirmDeleteWorkspace = () =>
        confirm(
            "Delete this workspace from Ambria? This won't change anything in the GitHub repository."
        );

    const handleDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onDelete && confirmDeleteWorkspace()) {
            onDelete(workspace.id);
        }
    };

    return (
        <Link
            href={`/workspace/${workspace.id}`}
            className="block group"
        >
            <div className="bg-white rounded-2xl border border-gray-200 p-6 transition-all duration-200 hover:border-gray-300 hover:shadow-sm hover:-translate-y-0.5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate transition-colors flex items-center gap-2">
                            {workspace.repo_name}
                            <ArrowUpRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
                        </h3>
                        <p className="text-sm text-gray-500 truncate">
                            {workspace.repo_owner}
                        </p>
                    </div>
                    <button
                        onClick={handleDelete}
                        className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete workspace"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                {/* Description */}
                {workspace.repo_description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                        {workspace.repo_description}
                    </p>
                )}

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
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
                <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-amber-500" />
                        <span>{workspace.repo_stars?.toLocaleString() || 0}</span>
                    </div>
                    {workspace.repo_language && (
                        <div className="flex items-center gap-1.5">
                            <Code2 className="w-4 h-4 text-gray-400" />
                            <span>{workspace.repo_language}</span>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
}
