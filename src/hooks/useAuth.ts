"use client";

import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, User, Session } from "@supabase/supabase-js";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        // Get initial session
        const getInitialSession = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);
        };

        getInitialSession();

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    const signInWithGitHub = useCallback(async () => {
        const scopes = process.env.NEXT_PUBLIC_GITHUB_OAUTH_SCOPES || "repo read:user";
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "github",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                scopes,
            },
        });
        if (error) {
            console.error("Error signing in with GitHub:", error);
        }
    }, [supabase]);

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
        router.push("/login");
    }, [supabase, router]);

    return {
        user,
        session,
        isLoading,
        signInWithGitHub,
        signOut,
    };
}
