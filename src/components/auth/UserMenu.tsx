"use client";

import { useAuth } from "@/hooks/useAuth";
import { ChevronDown, LogOut, User as UserIcon } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export function UserMenu() {
    const { user, signOut } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

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
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-violet-500/10 transition-all duration-200 border border-transparent hover:border-violet-500/20"
            >
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-8 h-8 rounded-full ring-2 ring-violet-500/30"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-500/30 flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-violet-300" />
                    </div>
                )}
                <span className="text-sm font-medium text-gray-300 hidden sm:block">
                    {displayName}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 glass-dark rounded-xl border border-violet-500/20 py-2 z-50 animate-scale-in shadow-xl shadow-black/20">
                    <div className="px-4 py-3 border-b border-violet-500/10">
                        <p className="text-sm font-medium text-white">{displayName}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    <div className="py-1">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                signOut();
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-violet-500/10 transition-all duration-200"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
