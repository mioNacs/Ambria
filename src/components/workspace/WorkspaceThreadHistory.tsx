"use client";

import * as React from "react";
import { Plus, MessageSquare, Search, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useWorkspaceThreads, WorkspaceThread } from "@/hooks/useWorkspaceThreads";
import { cn } from "@/lib/utils";

export interface WorkspaceThreadHistoryProps {
    workspaceId: string;
    position?: "left" | "right";
}

export function WorkspaceThreadHistory({
    workspaceId,
    position = "left",
}: WorkspaceThreadHistoryProps) {
    const {
        threads,
        currentThread,
        isLoading,
        switchToThread,
        createNewThread,
        deleteThread,
    } = useWorkspaceThreads(workspaceId);

    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");

    const filteredThreads = threads.filter((t) =>
        t.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        } else if (diffDays === 1) {
            return "Yesterday";
        } else if (diffDays < 7) {
            return date.toLocaleDateString([], { weekday: "short" });
        } else {
            return date.toLocaleDateString([], { month: "short", day: "numeric" });
        }
    };

    if (isCollapsed) {
        return (
            <div
                className={cn(
                    "flex flex-col items-center py-4 bg-gray-50 border-gray-200",
                    position === "left" ? "border-r" : "border-l"
                )}
            >
                <button
                    onClick={() => setIsCollapsed(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Expand sidebar"
                >
                    {position === "left" ? (
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                    ) : (
                        <ChevronLeft className="w-5 h-5 text-gray-500" />
                    )}
                </button>
                <button
                    onClick={createNewThread}
                    className="p-2 mt-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="New thread"
                >
                    <Plus className="w-5 h-5 text-emerald-600" />
                </button>
            </div>
        );
    }

    return (
        <div
            className={cn(
                "w-64 flex flex-col bg-gray-50 border-gray-200",
                position === "left" ? "border-r" : "border-l"
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <span className="font-medium text-gray-700 text-sm">Conversations</span>
                <button
                    onClick={() => setIsCollapsed(true)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Collapse sidebar"
                >
                    {position === "left" ? (
                        <ChevronLeft className="w-4 h-4 text-gray-500" />
                    ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                </button>
            </div>

            {/* New Thread Button */}
            <div className="px-3 py-2">
                <button
                    onClick={createNewThread}
                    className="flex items-center gap-2 w-full px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New Thread
                </button>
            </div>

            {/* Search */}
            <div className="px-3 pb-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Thread List */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredThreads.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500 text-sm">
                        {searchQuery ? "No threads found" : "No conversations yet"}
                    </div>
                ) : (
                    <div className="space-y-1 px-2">
                        {filteredThreads.map((thread) => (
                            <ThreadItem
                                key={thread.id}
                                thread={thread}
                                isActive={currentThread?.id === thread.tambo_thread_id}
                                onSelect={() => switchToThread(thread.tambo_thread_id)}
                                onDelete={() => deleteThread(thread.tambo_thread_id)}
                                formatDate={formatDate}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

interface ThreadItemProps {
    thread: WorkspaceThread;
    isActive: boolean;
    onSelect: () => void;
    onDelete: () => void;
    formatDate: (date: string) => string;
}

function ThreadItem({ thread, isActive, onSelect, onDelete, formatDate }: ThreadItemProps) {
    const [showDelete, setShowDelete] = React.useState(false);

    return (
        <div
            className={cn(
                "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                isActive
                    ? "bg-emerald-100 text-emerald-900"
                    : "hover:bg-gray-100 text-gray-700"
            )}
            onClick={onSelect}
            onMouseEnter={() => setShowDelete(true)}
            onMouseLeave={() => setShowDelete(false)}
        >
            <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-50" />
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                    {thread.title || `Thread ${thread.tambo_thread_id.slice(-6)}`}
                </div>
                <div className="text-xs text-gray-400">
                    {formatDate(thread.last_activity_at)}
                </div>
            </div>
            {showDelete && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="p-1 hover:bg-red-100 rounded transition-colors"
                    title="Delete thread"
                >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
            )}
        </div>
    );
}
