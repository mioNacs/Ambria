"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Check,
  FolderKanban,
  Lock,
  Sparkles,
  Zap,
} from "lucide-react";

import { LoginButton } from "@/components/auth/LoginButton";

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className="group rounded-2xl border border-gray-200 bg-white/70 backdrop-blur p-6 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-gray-900 text-white flex items-center justify-center shadow-sm">
          {icon}
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-600 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [authError, setAuthError] = useState(false);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const bgY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const bgOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.6]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setAuthError(Boolean(params.get("error")));
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Background */}
      <motion.div
        aria-hidden
        style={{ y: bgY, opacity: bgOpacity }}
        className="pointer-events-none fixed inset-0 -z-10 tech-grid"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-gray-50" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[72rem] h-[28rem] rounded-full blur-3xl opacity-60 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.16),transparent_60%)]" />
        <div className="absolute top-32 right-[-8rem] w-[36rem] h-[22rem] rounded-full blur-3xl opacity-50 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.18),transparent_60%)]" />
      </motion.div>

      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-gray-200/60 bg-white/70 backdrop-blur">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center shadow-sm">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-gray-900">Ambria</div>
                <div className="text-[11px] text-gray-500 hidden sm:block">
                  AI companion for open source work
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="#features"
                className="hidden sm:inline-flex text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Features
              </Link>
              <div className="w-44">
                <LoginButton className="!w-auto !px-4 !py-2.5 !text-sm" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6">
        {/* Hero */}
        <section className="pt-14 pb-12 lg:pt-20 lg:pb-20">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-white border border-gray-200 px-3 py-1 text-sm text-gray-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Open source workspace assistant
              </div>

              <h1 className="mt-6 text-4xl sm:text-5xl font-semibold tracking-tight text-gray-900">
                Move faster across issues, PRs, and codebase context with{" "}
                <span className="gradient-text">AI</span>
              </h1>
              <p className="mt-4 text-lg text-gray-600 max-w-xl">
                Connect a repository and keep work organized by workspace. Ask questions,
                triage issues, and understand unfamiliar projects quicker.
              </p>

              {authError && (
                <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  <span className="font-semibold">Sign in failed.</span> Please try
                  again.
                </div>
              )}

              <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="sm:w-72">
                  <LoginButton />
                </div>
                <Link
                  href="#how"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-gray-200 bg-white/80 hover:bg-white text-gray-900 font-medium transition-colors"
                >
                  See how it works
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <ul className="mt-8 space-y-3 text-gray-600">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <span>Find good first issues and understand context faster</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <span>Get quick repo overviews, file search, and multi-file pulls</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <span>Keep work organized by repository workspace</span>
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut", delay: 0.05 }}
              className="relative"
            >
              <div className="rounded-3xl border border-gray-200 bg-white/75 backdrop-blur shadow-sm overflow-hidden">
                <div className="p-8">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-xl font-semibold text-gray-900">Secure OAuth</h2>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Lock className="w-3.5 h-3.5" />
                      GitHub sign-in
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    Authenticate with GitHub to connect repositories and detect
                    permissions.
                  </p>

                  <div className="mt-6">
                    <LoginButton className="w-full" />
                  </div>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {["Issues", "Pull Requests", "Code Search"].map((label) => (
                      <motion.div
                        key={label}
                        whileHover={{ y: -4 }}
                        transition={{ type: "spring", stiffness: 320, damping: 24 }}
                        className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4"
                      >
                        <div className="text-xs text-gray-500">Focus</div>
                        <div className="mt-1 text-sm font-semibold text-gray-900">
                          {label}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-200 bg-gray-50 px-8 py-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs text-gray-500">Next</div>
                      <div className="text-sm font-semibold text-gray-900">
                        Create a workspace
                      </div>
                    </div>
                    <div className="rounded-xl bg-gray-900 text-white px-3 py-2 text-xs font-semibold">
                      /dashboard
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="pb-14 lg:pb-20">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="flex items-end justify-between gap-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900">
                  Designed for real OSS work
                </h2>
                <p className="mt-2 text-gray-600 max-w-2xl">
                  A workspace-first flow that keeps repos separate and makes it easy
                  to chat with context.
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <FeatureCard
                icon={<FolderKanban className="w-5 h-5" />}
                title="Workspace organization"
                description="Keep repo-specific threads, tokens, and context together so you can switch projects without losing your place."
              />
              <FeatureCard
                icon={<Zap className="w-5 h-5" />}
                title="Fast repo understanding"
                description="Pull file snippets, search code, and generate summaries that help you contribute faster—without the guesswork."
              />
            </div>
          </motion.div>
        </section>

        {/* How it works */}
        <section id="how" className="pb-14 lg:pb-20">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="rounded-3xl border border-gray-200 bg-white/70 backdrop-blur p-8 lg:p-10 shadow-sm"
          >
            <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900">
              Three-step flow
            </h2>
            <p className="mt-2 text-gray-600 max-w-2xl">
              The whole product stays simple: sign in, connect a repo, start asking.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "Sign in with GitHub",
                  description:
                    "OAuth keeps it secure and lets us verify access levels for each repo.",
                },
                {
                  title: "Add a workspace",
                  description:
                    "Each workspace is a repo + your role, with separate context and threads.",
                },
                {
                  title: "Chat with context",
                  description:
                    "Ask about issues, PRs, or code. Get answers tied to the repo you’re in.",
                },
              ].map((step, idx) => (
                <motion.div
                  key={step.title}
                  whileHover={{ y: -6 }}
                  transition={{ type: "spring", stiffness: 320, damping: 24 }}
                  className="rounded-2xl border border-gray-200 bg-white px-6 py-6"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-sm font-semibold">
                    {idx + 1}
                  </div>
                  <div className="mt-4 text-base font-semibold text-gray-900">
                    {step.title}
                  </div>
                  <div className="mt-2 text-sm text-gray-600 leading-relaxed">
                    {step.description}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        <footer className="pb-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200 pt-8 text-sm text-gray-500">
            <div>Ambria</div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Secure sign-in via GitHub
              </span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
