"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";

export function useGitHubToken() {
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const supabase = createClient();

    const fetchToken = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) {
                throw sessionError;
            }

            if (!session) {
                setToken(null);
                return;
            }

            // The provider token is available in the session
            const providerToken = session.provider_token;

            if (providerToken) {
                setToken(providerToken);
            } else {
                // If provider token is not in session, it might have been persisted
                // We need to get a fresh one through the provider refresh
                console.warn("GitHub provider token not found in session");
                setToken(null);
            }
        } catch (err) {
            setError(err instanceof Error ? err : new Error("Failed to get GitHub token"));
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchToken();

        // Refresh token when auth state changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(() => {
            fetchToken();
        });

        return () => subscription.unsubscribe();
    }, [supabase, fetchToken]);

    return {
        token,
        isLoading,
        error,
        refetch: fetchToken,
    };
}
