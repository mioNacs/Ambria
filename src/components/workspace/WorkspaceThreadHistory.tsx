"use client";

import * as React from "react";
import { Plus, MessageSquare, Search, ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";
import { useWorkspaceThreads, WorkspaceThread } from "@/hooks/useWorkspaceThreads";
import { NEW_THREAD_SHORTCUT } from "@/lib/shortcuts";
import { getFallbackThreadTitle } from "@/lib/thread-titles";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export interface WorkspaceThreadHistoryProps {
    workspaceId: string;
    position?: "left" | "right";
    mode?: "sidebar" | "overlay";
    onClose?: () => void;
}

export function WorkspaceThreadHistory({
    workspaceId,
    position = "left",
    mode = "sidebar",
    onClose,
}: WorkspaceThreadHistoryProps) {
    const {
        threads,
        currentThread,
        isLoading,
        error,
        switchToThread,
        createNewThread,
        deleteThread,
        refetch,
    } = useWorkspaceThreads(workspaceId);

    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");

    const isOverlay = mode === "overlay";
    const closeButtonRef = React.useRef<HTMLButtonElement | null>(null);

    React.useEffect(() => {
        if (!isOverlay) return;
        setIsCollapsed(false);
    }, [isOverlay]);

    React.useEffect(() => {
        if (!isOverlay) return;
        closeButtonRef.current?.focus();
    }, [isOverlay]);


    const handleCreateNewThread = React.useCallback(() => {
        createNewThread();
        if (isOverlay) {
            onClose?.();
        }
    }, [createNewThread, isOverlay, onClose]);

    const handleSwitchToThread = React.useCallback(
        (tamboThreadId: string) => {
            void switchToThread(tamboThreadId);
            if (isOverlay) {
                onClose?.();
            }
        },
        [switchToThread, isOverlay, onClose],
    );

    const getThreadLabel = (t: WorkspaceThread) =>
        t.title || getFallbackThreadTitle(t.tambo_thread_id);

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filteredThreads = normalizedQuery
        ? threads.filter((t) =>
            getThreadLabel(t).toLowerCase().includes(normalizedQuery)
        )
        : threads;

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

    if (!isOverlay && isCollapsed) {
        return (
            <div
                className={cn(
                    "w-14 h-full flex flex-col items-center py-4 bg-white/90 backdrop-blur border-gray-200 shadow-sm",
                    position === "left" ? "border-r" : "border-l",
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
                    onClick={handleCreateNewThread}
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
                "h-full flex flex-col bg-white/80 backdrop-blur border-gray-200",
                isOverlay ? "w-full" : "w-72",
                !isOverlay && (position === "left" ? "border-r" : "border-l"),
            )}
            onKeyDownCapture={
                isOverlay && onClose
                    ? (event) => {
                        if (event.key === "Escape") {
                            event.stopPropagation();
                            onClose();
                        }
                    }
                    : undefined
            }
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <div className="min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">Conversations</div>
                    <div className="text-xs text-gray-500">{threads.length} threads</div>
                </div>
                {isOverlay ? (
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={onClose}
                        className="p-2 -mr-1 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Close"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                ) : (
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
                )}
            </div>

            {/* New Thread Button */}
            <div className="px-3 py-2">
                <button
                    onClick={handleCreateNewThread}
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
                    <div className="px-2 py-3" aria-busy="true">
                        <span className="sr-only" role="status" aria-live="polite">
                            Loading threads…
                        </span>
                        <div className="space-y-2">
                            {[...Array(8)].map((_, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl"
                                >
                                    <Skeleton className="h-4 w-4 rounded-md" />
                                    <Skeleton className="h-4 w-40 flex-1 rounded-lg" />
                                    <Skeleton className="h-3 w-10 rounded-lg" />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {error ? (
                            <div
                                className="mx-2 mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-900"
                                role="alert"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-xs font-medium">Error loading threads</div>
                                    <button
                                        type="button"
                                        onClick={refetch}
                                        className="text-xs font-medium text-rose-900 hover:text-rose-950 underline underline-offset-2"
                                    >
                                        Retry
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        {filteredThreads.length === 0 ? (
                            <div className="px-4 py-8 text-center text-gray-500 text-sm">
                                {error
                                    ? "Couldn’t load conversations"
                                    : searchQuery
                                        ? "No threads found"
                                        : "No conversations yet"}
                            </div>
                        ) : (
                            <div className="space-y-1 px-2">
                                {filteredThreads.map((thread) => (
                                    <ThreadItem
                                        key={thread.id}
                                        thread={thread}
                                        threadLabel={getThreadLabel(thread)}
                                        isActive={currentThread?.id === thread.tambo_thread_id}
                                        onSelect={() => handleSwitchToThread(thread.tambo_thread_id)}
                                        onDelete={() => deleteThread(thread.tambo_thread_id)}
                                        formatDate={formatDate}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-200 text-xs text-gray-500">
                Tip: Press{" "}
                <span className="font-medium text-gray-700">{NEW_THREAD_SHORTCUT}</span> to
                start a new thread.
            </div>
        </div>
    );
}

interface ThreadItemProps {
    thread: WorkspaceThread;
    threadLabel: string;
    isActive: boolean;
    onSelect: () => void;
    onDelete: () => void;
    formatDate: (date: string) => string;
}

function ThreadItem({
    thread,
    threadLabel,
    isActive,
    onSelect,
    onDelete,
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
                    {formatDate(thread.last_activity_at)}
                </div>
            </div>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
                className={cn(
                    "p-1 rounded-lg transition-colors",
                    "opacity-0 pointer-events-none",
                    "group-hover:opacity-100 group-hover:pointer-events-auto",
                    "group-focus-within:opacity-100 group-focus-within:pointer-events-auto",
                    "focus-visible:opacity-100 focus-visible:pointer-events-auto",
                    "hover:bg-red-100 focus-visible:bg-red-100",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1 focus-visible:ring-offset-white",
                )}
                title="Delete thread"
                aria-label="Delete thread"
            >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
            </button>
        </div>
    );
}
