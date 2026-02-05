"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTamboThreadList, useTamboThread } from "@tambo-ai/react";
import { createClient } from "@/lib/supabase/client";

export interface WorkspaceThread {
    id: string;
    workspace_id: string;
    tambo_thread_id: string;
    title: string | null;
    last_activity_at: string;
    created_at: string;
}

function isMeaningfulThreadName(name: string | null | undefined): name is string {
    const trimmed = name?.trim();
    return !!trimmed && !trimmed.toLowerCase().startsWith("thread ");
}

function getFallbackThreadTitle(threadId: string) {
    return `Thread ${threadId.slice(-6)}`;
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
    const [linkedThreadIds, setLinkedThreadIds] = useState<Set<string>>(new Set());

    const workspaceThreadsRef = useRef(workspaceThreads);
    useEffect(() => {
        workspaceThreadsRef.current = workspaceThreads;
    }, [workspaceThreads]);

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
            setLinkedThreadIds(new Set((data || []).map((t: WorkspaceThread) => t.tambo_thread_id)));
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

            const updates = workspaceThreads
                .map((wsThread) => {
                    const tamboThread = tamboThreadsArray.find(
                        (t: { id: string; name?: string }) =>
                            t.id === wsThread.tambo_thread_id,
                    );

                    if (!isMeaningfulThreadName(tamboThread?.name)) {
                        return null;
                    }

                    if (tamboThread.name === wsThread.title) {
                        return null;
                    }

                    return {
                        tamboThreadId: wsThread.tambo_thread_id,
                        title: tamboThread.name,
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
                fetchWorkspaceThreads();
            } catch (err) {
                console.error("Error syncing thread titles:", err);
            }
        };

        syncTitles();
    }, [
        tamboThreadsArray,
        workspaceThreads,
        supabase,
        fetchWorkspaceThreads,
        workspaceId,
    ]);

    useEffect(() => {
        const upsertCurrentThread = async () => {
            if (!supabase) return;
            if (!currentThread?.id || !workspaceId) return;

            const messageCount = currentThread.messages?.length ?? 0;
            if (messageCount === 0) return;

            const existingTitle =
                workspaceThreadsRef.current.find(
                    (t) => t.tambo_thread_id === currentThread.id,
                )?.title ?? null;

            const fallbackTitle = getFallbackThreadTitle(currentThread.id);
            const title = isMeaningfulThreadName(currentThread.name)
                ? currentThread.name
                : existingTitle || currentThread.name || fallbackTitle;

            try {
                const { data, error } = await supabase
                    .from("workspace_threads")
                    .upsert(
                        {
                            workspace_id: workspaceId,
                            tambo_thread_id: currentThread.id,
                            title,
                            last_activity_at: new Date().toISOString(),
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
                        setLinkedThreadIds(
                            new Set(next.map((t) => t.tambo_thread_id)),
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
        currentThread?.messages?.length,
        currentThread?.name,
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
                await fetchWorkspaceThreads();
            } catch (err) {
                console.error("Error updating thread title:", err);
            }
        },
        [supabase, fetchWorkspaceThreads, workspaceId]
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
                await fetchWorkspaceThreads();
            } catch (err) {
                console.error("Error deleting thread:", err);
            }
        },
        [supabase, fetchWorkspaceThreads, workspaceId]
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

    // Filter Tambo threads to only show workspace threads
    const filteredThreads = tamboThreadsArray.filter((t: { id: string }) =>
        linkedThreadIds.has(t.id)
    );

    return {
        threads: workspaceThreads,
        tamboThreads: filteredThreads,
        currentThread,
        isLoading: isLoading || isLoadingTambo,
        switchToThread,
        createNewThread,
        updateThreadTitle,
        deleteThread,
        refetch: fetchWorkspaceThreads,
    };
}
