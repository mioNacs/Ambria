"use client";

import { useAuth } from "@/hooks/useAuth";
import { ChevronDown, Loader2, LogOut, User as UserIcon } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export function UserMenu() {
    const { user, signOut } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [signOutError, setSignOutError] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!user) return null;

    const avatarUrl = user.user_metadata?.avatar_url;
    const displayName = user.user_metadata?.user_name || user.email || "User";

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => {
                    if (!isOpen) setSignOutError(null);
                    setIsOpen(!isOpen);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
            >
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-8 h-8 rounded-full ring-2 ring-gray-200"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-gray-600" />
                    </div>
                )}
                <span className="text-sm font-medium text-gray-900 hidden sm:block">
                    {displayName}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-gray-200 py-2 z-50 animate-scale-in shadow-lg">
                    <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{displayName}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    <div className="py-1">
                        <button
                            onClick={async () => {
                                setSignOutError(null);
                                setIsSigningOut(true);
                                try {
                                    await signOut();
                                } catch (err) {
                                    console.error("Sign out failed", err);
                                    if (isMountedRef.current) {
                                        setSignOutError("Sign out failed. Please try again.");
                                        setIsOpen(true);
                                    }
                                } finally {
                                    if (isMountedRef.current) setIsSigningOut(false);
                                }
                            }}
                            disabled={isSigningOut}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isSigningOut ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <LogOut className="w-4 h-4" />
                            )}
                            {isSigningOut ? "Signing out…" : "Sign Out"}
                        </button>
                    </div>

                    {signOutError && (
                        <p
                            className="px-4 pb-2 text-xs text-rose-700"
                            aria-live="polite"
                        >
                            {signOutError}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
