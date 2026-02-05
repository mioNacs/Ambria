"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

/**
 * Hook to manage workspace-scoped threads.
 * Links Tambo threads to specific workspaces via Supabase.
 */
export function useWorkspaceThreads(workspaceId: string) {
    const supabase = createClient();
    const { data: allTamboThreads, isPending: isLoadingTambo } = useTamboThreadList();
    const { thread: currentThread, switchCurrentThread } = useTamboThread();

    const [workspaceThreads, setWorkspaceThreads] = useState<WorkspaceThread[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [linkedThreadIds, setLinkedThreadIds] = useState<Set<string>>(new Set());

    // Fetch workspace threads from Supabase
    const fetchWorkspaceThreads = useCallback(async () => {
        if (!workspaceId) return;

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
        fetchWorkspaceThreads();
    }, [fetchWorkspaceThreads]);

    // Track synced threads to prevent infinite loops
    const syncedThreadsRef = useRef<Set<string>>(new Set());

    // Sync Tambo thread names to workspace thread titles
    useEffect(() => {
        const syncTitles = async () => {
            // Get threads array from Tambo data (handle both array and object formats)
            const tamboThreadsArray = Array.isArray(allTamboThreads)
                ? allTamboThreads
                : allTamboThreads?.items || [];

            if (tamboThreadsArray.length === 0 || workspaceThreads.length === 0) return;

            let hasUpdates = false;

            for (const wsThread of workspaceThreads) {
                // Skip if already synced
                if (syncedThreadsRef.current.has(wsThread.tambo_thread_id)) continue;

                const tamboThread = tamboThreadsArray.find(
                    (t: { id: string; name?: string }) => t.id === wsThread.tambo_thread_id
                );

                // If Tambo has a real name (not just the ID fallback) and it differs from stored title
                if (tamboThread?.name &&
                    tamboThread.name !== wsThread.title &&
                    !tamboThread.name.startsWith('Thread ')) {
                    try {
                        await supabase
                            .from("workspace_threads")
                            .update({ title: tamboThread.name })
                            .eq("tambo_thread_id", wsThread.tambo_thread_id);
                        hasUpdates = true;
                        // Mark as synced
                        syncedThreadsRef.current.add(wsThread.tambo_thread_id);
                    } catch (err) {
                        console.error("Error syncing thread title:", err);
                    }
                } else {
                    // Mark as synced (no update needed)
                    syncedThreadsRef.current.add(wsThread.tambo_thread_id);
                }
            }
            // Only refresh if we made updates
            if (hasUpdates) {
                fetchWorkspaceThreads();
            }
        };

        syncTitles();
    }, [allTamboThreads, workspaceThreads, supabase, fetchWorkspaceThreads]);

    // Link current thread to workspace when it has messages
    const linkCurrentThread = useCallback(async () => {
        if (!currentThread?.id || !workspaceId) return;
        if (linkedThreadIds.has(currentThread.id)) return;

        const hasMessages = currentThread.messages && currentThread.messages.length > 0;
        if (!hasMessages) return;

        try {
            const { error } = await supabase.from("workspace_threads").upsert(
                {
                    workspace_id: workspaceId,
                    tambo_thread_id: currentThread.id,
                    title: currentThread.name || `Thread ${currentThread.id.slice(-6)}`,
                    last_activity_at: new Date().toISOString(),
                },
                { onConflict: "tambo_thread_id" }
            );

            if (error) throw error;

            // Refresh the list
            await fetchWorkspaceThreads();
        } catch (err) {
            console.error("Error linking thread to workspace:", err);
        }
    }, [currentThread, workspaceId, linkedThreadIds, supabase, fetchWorkspaceThreads]);

    // Auto-link when thread gets messages
    useEffect(() => {
        linkCurrentThread();
    }, [currentThread?.messages?.length, linkCurrentThread]);

    // Update thread title
    const updateThreadTitle = useCallback(
        async (tamboThreadId: string, title: string) => {
            try {
                const { error } = await supabase
                    .from("workspace_threads")
                    .update({ title })
                    .eq("tambo_thread_id", tamboThreadId);

                if (error) throw error;
                await fetchWorkspaceThreads();
            } catch (err) {
                console.error("Error updating thread title:", err);
            }
        },
        [supabase, fetchWorkspaceThreads]
    );

    // Delete thread
    const deleteThread = useCallback(
        async (tamboThreadId: string) => {
            try {
                const { error } = await supabase
                    .from("workspace_threads")
                    .delete()
                    .eq("tambo_thread_id", tamboThreadId);

                if (error) throw error;
                await fetchWorkspaceThreads();
            } catch (err) {
                console.error("Error deleting thread:", err);
            }
        },
        [supabase, fetchWorkspaceThreads]
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
        // Switch to undefined to start fresh thread
        await switchCurrentThread(undefined as unknown as string);
    }, [switchCurrentThread]);

    // Filter Tambo threads to only show workspace threads
    const tamboThreadsArray = Array.isArray(allTamboThreads) ? allTamboThreads : [];
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
