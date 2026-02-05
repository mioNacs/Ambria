"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback, useMemo } from "react";

export interface Workspace {
    id: string;
    user_id: string;
    repo_owner: string;
    repo_name: string;
    repo_url: string;
    role: "contributor" | "maintainer" | "both";
    detected_access: "read" | "write" | "admin";
    repo_stars: number;
    repo_language: string | null;
    repo_description: string | null;
    created_at: string;
}

export interface CreateWorkspaceInput {
    repo_owner: string;
    repo_name: string;
    repo_url: string;
    role: "contributor" | "maintainer" | "both";
    detected_access: "read" | "write" | "admin";
    repo_stars?: number;
    repo_language?: string | null;
    repo_description?: string | null;
}

export function useWorkspaces() {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const supabase = useMemo(() => {
        if (typeof window === "undefined") return null;
        return createClient();
    }, []);

    const fetchWorkspaces = useCallback(async () => {
        if (!supabase) return;

        try {
            setIsLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from("workspaces")
                .select("*")
                .order("created_at", { ascending: false });

            if (fetchError) {
                throw fetchError;
            }

            setWorkspaces(data || []);
        } catch (err) {
            setError(err instanceof Error ? err : new Error("Failed to fetch workspaces"));
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        if (!supabase) return;
        fetchWorkspaces();
    }, [supabase, fetchWorkspaces]);

    const createWorkspace = useCallback(
        async (input: CreateWorkspaceInput): Promise<Workspace> => {
            if (!supabase) {
                throw new Error("Supabase client not initialized");
            }

            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                throw new Error("Not authenticated");
            }

            const { data, error: createError } = await supabase
                .from("workspaces")
                .insert({
                    user_id: user.id,
                    ...input,
                })
                .select()
                .single();

            if (createError) {
                if (createError.code === "23505") {
                    throw new Error("You already have a workspace for this repository");
                }
                throw createError;
            }

            setWorkspaces((prev) => [data, ...prev]);
            return data;
        },
        [supabase]
    );

    const deleteWorkspace = useCallback(
        async (id: string) => {
            if (!supabase) {
                throw new Error("Supabase client not initialized");
            }

            const { error: deleteError } = await supabase
                .from("workspaces")
                .delete()
                .eq("id", id);

            if (deleteError) {
                throw deleteError;
            }

            setWorkspaces((prev) => prev.filter((w) => w.id !== id));
        },
        [supabase]
    );

    const getWorkspace = useCallback(
        async (id: string): Promise<Workspace | null> => {
            if (!supabase) {
                throw new Error("Supabase client not initialized");
            }

            const { data, error: fetchError } = await supabase
                .from("workspaces")
                .select("*")
                .eq("id", id)
                .single();

            if (fetchError) {
                if (fetchError.code === "PGRST116") {
                    return null;
                }
                throw fetchError;
            }

            return data;
        },
        [supabase]
    );

    return {
        workspaces,
        isLoading,
        error,
        refetch: fetchWorkspaces,
        createWorkspace,
        deleteWorkspace,
        getWorkspace,
    };
}
