"use client";

import { Workspace } from "@/hooks/useWorkspaces";
import { Star, Code2, Trash2, ArrowUpRight, GitBranch, Shield, Edit3, Eye } from "lucide-react";
import Link from "next/link";

interface WorkspaceCardProps {
    workspace: Workspace;
    onDelete?: (id: string) => void;
}

const roleConfig = {
    contributor: {
        bg: "bg-gradient-to-br from-emerald-50 to-emerald-100/50",
        text: "text-emerald-700",
        border: "border-emerald-200/60",
        icon: GitBranch,
        description: "Contributing to open source"
    },
    maintainer: {
        bg: "bg-gradient-to-br from-amber-50 to-amber-100/50",
        text: "text-amber-700",
        border: "border-amber-200/60",
        icon: Shield,
        description: "Maintaining the project"
    },
    both: {
        bg: "bg-gradient-to-br from-indigo-50 to-indigo-100/50",
        text: "text-indigo-700",
        border: "border-indigo-200/60",
        icon: Shield,
        description: "Full access"
    },
};

const accessConfig = {
    read: { icon: Eye, label: "Read", color: "text-gray-600" },
    write: { icon: Edit3, label: "Write", color: "text-emerald-600" },
    admin: { icon: Shield, label: "Admin", color: "text-rose-600" },
};

export function WorkspaceCard({ workspace, onDelete }: WorkspaceCardProps) {
    const handleDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onDelete?.(workspace.id);
    };

    const roleData = roleConfig[workspace.role];
    const accessData = accessConfig[workspace.detected_access];
    const RoleIcon = roleData.icon;
    const AccessIcon = accessData.icon;

    return (
        <Link
            href={`/workspace/${workspace.id}`}
            className="block group"
        >
            <div className="relative bg-white rounded-2xl border border-gray-200 overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-100/50 hover:-translate-y-1">
                {/* Gradient Background Accent */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${roleData.bg}`} />
                
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-emerald-600 transition-colors">
                                    {workspace.repo_name}
                                </h3>
                                <ArrowUpRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-x-1 translate-y-1 group-hover:translate-x-0 group-hover:translate-y-0" />
                            </div>
                            <p className="text-sm text-gray-500 truncate font-medium">
                                {workspace.repo_owner}
                            </p>
                        </div>
                        <button
                            onClick={handleDelete}
                            className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                            title="Delete workspace"
                            aria-label="Delete workspace"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Description */}
                    {workspace.repo_description ? (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-4 leading-relaxed">
                            {workspace.repo_description}
                        </p>
                    ) : (
                        <p className="text-sm text-gray-400 italic mb-4">
                            No description available
                        </p>
                    )}

                    {/* Role Badge */}
                    <div className="mb-4">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${roleData.border} ${roleData.bg} ${roleData.text}`}>
                            <RoleIcon className="w-3.5 h-3.5" />
                            <span>{workspace.role.charAt(0).toUpperCase() + workspace.role.slice(1)}</span>
                        </div>
                    </div>

                    {/* Stats & Access */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1.5 text-gray-600">
                                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                <span className="font-medium">{workspace.repo_stars?.toLocaleString() || 0}</span>
                            </div>
                            {workspace.repo_language && (
                                <div className="flex items-center gap-1.5 text-gray-600">
                                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500" />
                                    <span className="font-medium">{workspace.repo_language}</span>
                                </div>
                            )}
                        </div>
                        <div className={`flex items-center gap-1 text-xs font-medium ${accessData.color}`}>
                            <AccessIcon className="w-3.5 h-3.5" />
                            <span>{accessData.label}</span>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
