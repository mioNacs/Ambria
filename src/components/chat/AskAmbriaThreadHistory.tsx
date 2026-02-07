"use client";

import * as React from "react";
import { Plus, MessageSquare, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTamboThread, useTamboThreadList } from "@tambo-ai/react";

interface AskAmbriaThreadHistoryProps {
    position?: "left" | "right";
}

export function AskAmbriaThreadHistory({
    position = "left",
}: AskAmbriaThreadHistoryProps) {
    const { data: threadsResult, isLoading } = useTamboThreadList();
    const { thread: currentThread, switchCurrentThread, startNewThread } = useTamboThread();

    // Fix: threadsResult might be an object with items, or an array depending on SDK version. 
    // Checking previous file (thread-history.tsx) lines 81, 420.
    const threads = threadsResult?.items || [];

    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");

    const getThreadLabel = (t: any) => t.name || `Thread ${t.id.substring(0, 8)}`;

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filteredThreads = React.useMemo(() => {
        if (!threads) return [];
        return normalizedQuery
            ? threads.filter((t: any) =>
                getThreadLabel(t).toLowerCase().includes(normalizedQuery)
            )
            : threads;
    }, [threads, normalizedQuery]);

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
                    "w-14 flex flex-col items-center py-4 bg-white/90 backdrop-blur border-gray-200 shadow-sm",
                    position === "left" ? "border-r" : "border-l",
                )}
            >
                <button
                    onClick={() => setIsCollapsed(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Expand sidebar"
                >
                    {position === "left" ? (
                        <ChevronLeft className="w-5 h-5 text-gray-500" />
                    ) : (
                        <ChevronLeft className="w-5 h-5 text-gray-500" />
                    )}
                </button>
                <button
                    onClick={() => startNewThread()}
                    className="p-2 mt-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="New thread"
                >
                    <Plus className="w-5 h-5 text-gray-900" />
                </button>
            </div>
        );
    }

    return (
        <div
            className={cn(
                "w-72 flex flex-col bg-white/80 backdrop-blur border-gray-200",
                position === "left" ? "border-r" : "border-l",
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <div className="min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">Ask Ambria</div>
                    <div className="text-xs text-gray-500">{threads.length} threads</div>
                </div>
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
                    onClick={() => startNewThread()}
                    className="flex items-center gap-2 w-full px-3 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-xl transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50"
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
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
                        {filteredThreads.map((thread: any) => (
                            <ThreadItem
                                key={thread.id}
                                thread={thread}
                                threadLabel={getThreadLabel(thread)}
                                isActive={currentThread?.id === thread.id}
                                onSelect={() => switchCurrentThread(thread.id)}
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
    thread: any;
    threadLabel: string;
    isActive: boolean;
    onSelect: () => void;
    formatDate: (date: string) => string;
}

function ThreadItem({
    thread,
    threadLabel,
    isActive,
    onSelect,
    formatDate,
}: ThreadItemProps) {
    return (
        <div
            className={cn(
                "group flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors",
                isActive
                    ? "bg-emerald-50 text-gray-900"
                    : "hover:bg-gray-100 text-gray-700",
            )}
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect();
                }
            }}
        >
            <div
                className={cn(
                    "h-8 w-1 rounded-full",
                    isActive ? "bg-emerald-500" : "bg-transparent",
                )}
            />
            <MessageSquare
                className={cn(
                    "w-4 h-4 flex-shrink-0",
                    isActive ? "text-emerald-700" : "text-gray-400",
                )}
            />
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                    {threadLabel}
                </div>
                <div className="text-xs text-gray-400">
                    {formatDate(thread.updatedAt || thread.createdAt)}
                </div>
            </div>
        </div>
    );
}
