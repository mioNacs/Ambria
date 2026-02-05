import { LoginButton } from "@/components/auth/LoginButton";
import { Check, Lock } from "lucide-react";

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="mx-auto w-full max-w-6xl px-6 py-12 lg:py-20">
                <div className="grid gap-10 lg:grid-cols-2 items-center">
                    {/* Left: Product pitch */}
                    <div className="animate-fade-in-up">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white border border-gray-200 px-3 py-1 text-sm text-gray-700">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Open source workspace assistant
                        </div>

                        <div className="mt-6 flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center shadow-sm">
                                <svg
                                    className="w-6 h-6 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M9 12l2 2 4-4"
                                    />
                                </svg>
                            </div>
                            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-gray-900">
                                Ambria
                            </h1>
                        </div>
                        <p className="mt-4 text-lg text-gray-600 max-w-xl">
                            Connect a repo, ask questions, and get help navigating issues,
                            pull requests, and contributions.
                        </p>

                        <ul className="mt-8 space-y-3 text-gray-600">
                            <li className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-emerald-600 mt-0.5" />
                                <span>Find good first issues and understand context faster</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-emerald-600 mt-0.5" />
                                <span>Get a quick overview of unfamiliar codebases</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <Check className="w-5 h-5 text-emerald-600 mt-0.5" />
                                <span>Keep work organized by repository workspace</span>
                            </li>
                        </ul>
                    </div>

                    {/* Right: Login card */}
                    <div
                        className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 animate-fade-in-up"
                        style={{ animationDelay: "0.05s" }}
                    >
                        <div className="flex items-center justify-between gap-4">
                            <h2 className="text-xl font-semibold text-gray-900">Sign in</h2>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Lock className="w-3.5 h-3.5" />
                                Secure OAuth
                            </div>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">
                            Continue with GitHub to connect repositories and detect
                            permissions.
                        </p>

                        <div className="mt-6">
                            <LoginButton className="w-full" />
                        </div>

                        <div className="mt-6 rounded-xl bg-gray-50 border border-gray-200 p-4">
                            <p className="text-xs text-gray-600">
                                We use your GitHub identity to personalize your workspace
                                experience. You can sign out anytime.
                            </p>
                        </div>
                    </div>
                </div>

                <p className="mt-10 text-center text-xs text-gray-500 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                    By continuing, you agree to authenticate with GitHub.
                </p>
            </div>
        </div>
    );
}
