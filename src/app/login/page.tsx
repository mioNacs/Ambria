import { LoginButton } from "@/components/auth/LoginButton";

export default function LoginPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0f] tech-grid relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl animate-pulse-glow" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-900/10 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md px-8 relative z-10">
                {/* Logo & Branding */}
                <div className="text-center mb-10 animate-fade-in-up">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 mb-6 animate-float shadow-2xl animate-pulse-glow">
                        <svg
                            className="w-10 h-10 text-white"
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
                    <h1 className="text-4xl font-bold mb-3">
                        <span className="gradient-text">Ambria</span>
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Your AI-powered open source companion
                    </p>
                </div>

                {/* Login Card */}
                <div className="glass-dark rounded-2xl p-8 shadow-2xl animate-fade-in-up border border-violet-500/20" style={{ animationDelay: "0.1s" }}>
                    <h2 className="text-xl font-semibold text-white text-center mb-2">
                        Welcome Back
                    </h2>
                    <p className="text-gray-500 text-center text-sm mb-6">
                        Connect with GitHub to continue
                    </p>

                    <LoginButton className="w-full transform hover:scale-[1.02] transition-all duration-200" />

                    <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
                        <span className="text-xs text-gray-600">SECURE LOGIN</span>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
                    </div>

                    <p className="text-xs text-gray-500 text-center">
                        We use your GitHub to detect repository permissions
                        and personalize your experience.
                    </p>
                </div>

                {/* Features Preview */}
                <div className="mt-8 grid grid-cols-3 gap-4">
                    <div className="glass-dark rounded-xl p-4 border border-violet-500/10 text-center animate-fade-in-up card-hover" style={{ animationDelay: "0.2s" }}>
                        <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-violet-500/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <h3 className="text-sm font-medium text-white mb-1">Discover</h3>
                        <p className="text-xs text-gray-500">Find issues</p>
                    </div>
                    <div className="glass-dark rounded-xl p-4 border border-cyan-500/10 text-center animate-fade-in-up card-hover" style={{ animationDelay: "0.3s" }}>
                        <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <h3 className="text-sm font-medium text-white mb-1">Chat</h3>
                        <p className="text-xs text-gray-500">AI assistance</p>
                    </div>
                    <div className="glass-dark rounded-xl p-4 border border-violet-500/10 text-center animate-fade-in-up card-hover" style={{ animationDelay: "0.4s" }}>
                        <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-violet-500/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-sm font-medium text-white mb-1">Contribute</h3>
                        <p className="text-xs text-gray-500">Ship code</p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-gray-600 text-xs mt-8 animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
                    Built with ❤️ for the open source community
                </p>
            </div>
        </div>
    );
}
