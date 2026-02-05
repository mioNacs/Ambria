"use client";

import { Github, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef, useState } from "react";

interface LoginButtonProps {
    className?: string;
}

export function LoginButton({ className = "" }: LoginButtonProps) {
    const { signInWithGitHub } = useAuth();
    const [isStartingAuth, setIsStartingAuth] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const handleSignIn = async () => {
        setError(null);
        setIsStartingAuth(true);

        try {
            await signInWithGitHub();
        } catch (err) {
            console.error("GitHub sign in failed", err);
            if (isMountedRef.current) {
                setError(
                    "Something went wrong starting GitHub sign in. Please try again."
                );
            }
        } finally {
            if (isMountedRef.current) setIsStartingAuth(false);
        }
    };

    return (
        <div className="w-full">
            <button
                type="button"
                onClick={handleSignIn}
                disabled={isStartingAuth}
                className={`flex w-full items-center justify-center gap-3 px-6 py-3.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
            >
                {isStartingAuth ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <Github className="w-5 h-5" />
                )}
                {isStartingAuth ? "Connecting…" : "Continue with GitHub"}
            </button>
            {error && (
                <p className="mt-2 text-xs text-rose-700" aria-live="polite">
                    {error}
                </p>
            )}
        </div>
    );
}
