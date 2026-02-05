"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTamboThreadList, useTamboThread } from "@tambo-ai/react";
import { createClient } from "@/lib/supabase/client";
import { getFallbackThreadTitle, getMeaningfulThreadName } from "@/lib/thread-titles";

export interface WorkspaceThread {
    id: string;
    workspace_id: string;
    tambo_thread_id: string;
    title: string | null;
    last_activity_at: string;
    created_at: string;
}

/**
 * Hook to manage workspace-scoped threads.
 * Links Tambo threads to specific workspaces via Supabase.
 */
export function useWorkspaceThreads(workspaceId: string) {
    const supabase = useMemo(() => {
        if (typeof window === "undefined") return null;
        return createClient();
    }, []);
    const { data: allTamboThreads, isPending: isLoadingTambo } = useTamboThreadList();
    const { thread: currentThread, switchCurrentThread, startNewThread } = useTamboThread();

    const [workspaceThreads, setWorkspaceThreads] = useState<WorkspaceThread[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const currentWorkspaceThread = useMemo(() => {
        if (!currentThread?.id) return null;
        return (
            workspaceThreads.find((t) => t.tambo_thread_id === currentThread.id) ??
            null
        );
    }, [currentThread?.id, workspaceThreads]);

    const currentWorkspaceThreadTitle = currentWorkspaceThread?.title ?? null;
    const currentWorkspaceThreadLastActivityAt =
        currentWorkspaceThread?.last_activity_at ?? null;

    const currentMessageCount = currentThread?.messages?.length ?? 0;
    const lastMessageCreatedAt =
        currentMessageCount > 0
            ? currentThread?.messages?.[currentMessageCount - 1]?.createdAt
            : null;

    // Fetch workspace threads from Supabase
    const fetchWorkspaceThreads = useCallback(async () => {
        if (!supabase || !workspaceId) return;

        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from("workspace_threads")
                .select("*")
                .eq("workspace_id", workspaceId)
                .order("last_activity_at", { ascending: false });

            if (error) throw error;

            setWorkspaceThreads(data || []);
        } catch (err) {
            console.error("Error fetching workspace threads:", err);
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId, supabase]);

    // Load workspace threads on mount
    useEffect(() => {
        if (!supabase) return;
        fetchWorkspaceThreads();
    }, [supabase, fetchWorkspaceThreads]);

    const tamboThreadsArray = useMemo(() => {
        if (Array.isArray(allTamboThreads)) {
            return allTamboThreads;
        }

        return (allTamboThreads as { items?: Array<{ id: string; name?: string }> } | undefined)?.items ?? [];
    }, [allTamboThreads]);

    // Sync Tambo thread names to workspace thread titles
    useEffect(() => {
        const syncTitles = async () => {
            if (!supabase) return;
            if (tamboThreadsArray.length === 0 || workspaceThreads.length === 0) return;

            const tamboNameById = new Map(
                tamboThreadsArray.map((t: { id: string; name?: string }) => [
                    t.id,
                    t.name,
                ]),
            );

            const updates = workspaceThreads
                .map((wsThread) => {
                    const tamboName = tamboNameById.get(wsThread.tambo_thread_id);

                    const meaningfulName = getMeaningfulThreadName(
                        wsThread.tambo_thread_id,
                        tamboName,
                    );

                    if (!meaningfulName) {
                        return null;
                    }

                    if (meaningfulName === wsThread.title) {
                        return null;
                    }

                    return {
                        tamboThreadId: wsThread.tambo_thread_id,
                        title: meaningfulName,
                    };
                })
                .filter(Boolean) as Array<{ tamboThreadId: string; title: string }>;

            if (updates.length === 0) {
                return;
            }

            try {
                await Promise.all(
                    updates.map(({ tamboThreadId, title }) =>
                        supabase
                            .from("workspace_threads")
                            .update({ title })
                            .eq("workspace_id", workspaceId)
                            .eq("tambo_thread_id", tamboThreadId),
                    ),
                );
                setWorkspaceThreads((prev) =>
                    prev.map((t) => {
                        const match = updates.find(
                            (u) => u.tamboThreadId === t.tambo_thread_id,
                        );
                        return match ? { ...t, title: match.title } : t;
                    }),
                );
            } catch (err) {
                console.error("Error syncing thread titles:", err);
            }
        };

        syncTitles();
    }, [
        tamboThreadsArray,
        workspaceThreads,
        supabase,
        workspaceId,
    ]);

    useEffect(() => {
        const upsertCurrentThread = async () => {
            if (!supabase) return;
            if (!currentThread?.id || !workspaceId) return;

            if (currentMessageCount === 0) return;
            const lastActivityAt =
                lastMessageCreatedAt ?? new Date().toISOString();

            const existingTitle = currentWorkspaceThreadTitle;

            const fallbackTitle = getFallbackThreadTitle(currentThread.id);
            const meaningfulName = getMeaningfulThreadName(
                currentThread.id,
                currentThread.name,
            );
            const title =
                meaningfulName || existingTitle || currentThread.name || fallbackTitle;

            if (
                currentWorkspaceThreadTitle === title &&
                currentWorkspaceThreadLastActivityAt === lastActivityAt
            ) {
                return;
            }

            try {
                const { data, error } = await supabase
                    .from("workspace_threads")
                    .upsert(
                        {
                            workspace_id: workspaceId,
                            tambo_thread_id: currentThread.id,
                            title,
                            last_activity_at: lastActivityAt,
                        },
                        { onConflict: "tambo_thread_id" },
                    )
                    .select("*")
                    .single();

                if (error) {
                    throw error;
                }

                if (data) {
                    setWorkspaceThreads((prev) => {
                        const existingIndex = prev.findIndex(
                            (t) => t.tambo_thread_id === data.tambo_thread_id,
                        );
                        const next = [...prev];
                        if (existingIndex >= 0) {
                            next[existingIndex] = data as WorkspaceThread;
                        } else {
                            next.unshift(data as WorkspaceThread);
                        }
                        next.sort(
                            (a, b) =>
                                new Date(b.last_activity_at).getTime() -
                                new Date(a.last_activity_at).getTime(),
                        );
                        return next;
                    });
                }
            } catch (err) {
                console.error("Error linking thread to workspace:", err);
            }
        };

        void upsertCurrentThread();
    }, [
        currentThread?.id,
        currentMessageCount,
        lastMessageCreatedAt,
        currentThread?.name,
        currentWorkspaceThreadTitle,
        currentWorkspaceThreadLastActivityAt,
        supabase,
        workspaceId,
    ]);

    // Update thread title
    const updateThreadTitle = useCallback(
        async (tamboThreadId: string, title: string) => {
            try {
                if (!supabase) return;
                const { error } = await supabase
                    .from("workspace_threads")
                    .update({ title })
                    .eq("workspace_id", workspaceId)
                    .eq("tambo_thread_id", tamboThreadId);

                if (error) throw error;
                setWorkspaceThreads((prev) =>
                    prev.map((t) =>
                        t.tambo_thread_id === tamboThreadId
                            ? { ...t, title }
                            : t,
                    ),
                );
            } catch (err) {
                console.error("Error updating thread title:", err);
            }
        },
        [supabase, workspaceId]
    );

    // Delete thread
    const deleteThread = useCallback(
        async (tamboThreadId: string) => {
            try {
                if (!supabase) return;
                const { error } = await supabase
                    .from("workspace_threads")
                    .delete()
                    .eq("workspace_id", workspaceId)
                    .eq("tambo_thread_id", tamboThreadId);

                if (error) throw error;
                setWorkspaceThreads((prev) =>
                    prev.filter((t) => t.tambo_thread_id !== tamboThreadId),
                );
            } catch (err) {
                console.error("Error deleting thread:", err);
            }
        },
        [supabase, workspaceId]
    );

    // Switch to a specific thread
    const switchToThread = useCallback(
        async (tamboThreadId: string) => {
            await switchCurrentThread(tamboThreadId);
        },
        [switchCurrentThread]
    );

    // Create new thread (clears current for fresh start)
    const createNewThread = useCallback(async () => {
        startNewThread();
    }, [startNewThread]);

    return {
        threads: workspaceThreads,
        currentThread,
        isLoading: isLoading || isLoadingTambo,
        switchToThread,
        createNewThread,
        updateThreadTitle,
        deleteThread,
        refetch: fetchWorkspaceThreads,
    };
}
