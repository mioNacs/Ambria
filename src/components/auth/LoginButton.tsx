"use client";

import { Github } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface LoginButtonProps {
    className?: string;
}

export function LoginButton({ className = "" }: LoginButtonProps) {
    const { signInWithGitHub } = useAuth();

    return (
        <button
            onClick={signInWithGitHub}
            className={`flex items-center justify-center gap-3 px-6 py-3.5 bg-white hover:bg-gray-100 text-gray-900 font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl ${className}`}
        >
            <Github className="w-5 h-5" />
            Continue with GitHub
        </button>
    );
}
