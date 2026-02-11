"use client";

import { useState } from "react";
import { X, Loader2, Check, AlertCircle } from "lucide-react";
import { useGitHubToken } from "@/hooks/useGitHubToken";
import { useWorkspaces, CreateWorkspaceInput } from "@/hooks/useWorkspaces";
import {
    parseGitHubUrl,
    getRepoDetails,
    checkRepoPermissions,
    getSuggestedRole,
    RepoDetails,
    RepoPermissions,
} from "@/lib/github";

interface AddWorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

type Step = "input" | "checking" | "select-role" | "creating" | "error";

export function AddWorkspaceModal({
    isOpen,
    onClose,
    onSuccess,
}: AddWorkspaceModalProps) {
    const [step, setStep] = useState<Step>("input");
    const [repoUrl, setRepoUrl] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [repoDetails, setRepoDetails] = useState<RepoDetails | null>(null);
    const [permissions, setPermissions] = useState<RepoPermissions | null>(null);
    const [selectedRole, setSelectedRole] = useState<"contributor" | "maintainer" | "both">("contributor");

    const { token } = useGitHubToken();
    const { createWorkspace } = useWorkspaces();

    const resetState = () => {
        setStep("input");
        setRepoUrl("");
        setError(null);
        setRepoDetails(null);
        setPermissions(null);
        setSelectedRole("contributor");
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleCheckRepo = async () => {
        const parsed = parseGitHubUrl(repoUrl);
        if (!parsed) {
            setError("Invalid GitHub URL. Try: https://github.com/owner/repo");
            return;
        }

        setStep("checking");
        setError(null);

        try {
            // Fetch repo details
            const details = await getRepoDetails(parsed.owner, parsed.repo, token || undefined);
            setRepoDetails(details);

            // Check permissions if we have a token
            if (token) {
                const perms = await checkRepoPermissions(parsed.owner, parsed.repo, token);
                setPermissions(perms);
                setSelectedRole(getSuggestedRole(perms));
            } else {
                setPermissions({ access: "read", push: false, pull: true, admin: false });
                setSelectedRole("contributor");
            }

            setStep("select-role");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to check repository");
            setStep("error");
        }
    };

    const handleCreateWorkspace = async () => {
        if (!repoDetails || !permissions) return;

        setStep("creating");
        setError(null);

        try {
            const input: CreateWorkspaceInput = {
                repo_owner: repoDetails.owner,
                repo_name: repoDetails.name,
                repo_url: repoDetails.url,
                role: selectedRole,
                detected_access: permissions.access,
                repo_stars: repoDetails.stars,
                repo_language: repoDetails.language,
                repo_description: repoDetails.description,
            };

            await createWorkspace(input);
            handleClose();
            onSuccess?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create workspace");
            setStep("error");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative bg-white border-2 border-black rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Add Workspace</h2>
                    <button
                        onClick={handleClose}
                        className="p-1 text-gray-400 hover:text-gray-900 rounded-full border-2 border-white hover:border-gray-900 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Input Step */}
                    {(step === "input" || step === "error") && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">
                                    GitHub Repository URL
                                </label>
                                <input
                                    type="text"
                                    value={repoUrl}
                                    onChange={(e) => setRepoUrl(e.target.value)}
                                    placeholder="https://github.com/owner/repo"
                                    className="w-full px-4 py-3 border-2 border-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    onKeyDown={(e) => e.key === "Enter" && handleCheckRepo()}
                                />
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 border-2 border-red-700 rounded-lg">
                                    <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            )}

                            <button
                                onClick={handleCheckRepo}
                                disabled={!repoUrl.trim()}
                                className="w-full py-3 bg-gray-900 hover:bg-green-50 hover:text-black border-2 border-white hover:border-black disabled:bg-gray-300 text-white font-medium rounded-lg transition-all duration-200 disabled:cursor-not-allowed disabled:hover:bg-gray-300 disabled:hover:text-white"
                            >
                                Check Repository
                            </button>
                        </div>
                    )}

                    {/* Checking Step */}
                    {step === "checking" && (
                        <div className="flex flex-col items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-4" />
                            <p className="text-gray-800">Checking repository...</p>
                        </div>
                    )}

                    {/* Select Role Step */}
                    {step === "select-role" && repoDetails && permissions && (
                        <div className="space-y-4">
                            {/* Repo Info */}
                            <div className="bg-green-50/50 rounded-lg px-4 py-3 border-2 border-black">
                                <div className="flex items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-gray-900 truncate">
                                            {repoDetails.fullName}
                                        </h3>
                                        {repoDetails.description && (
                                            <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                                                {repoDetails.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                                            <span>⭐ {repoDetails.stars.toLocaleString()}</span>
                                            {repoDetails.language && <span>{repoDetails.language}</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Access Level */}
                            <div className="flex items-center gap-2 p-3 bg-emerald-50 border-2 border-emerald-700 rounded-lg">
                                <Check className="w-5 h-5 text-emerald-600" />
                                <span className="text-sm text-emerald-700">
                                    Detected access level:{" "}
                                    <strong className="capitalize">{permissions.access}</strong>
                                </span>
                            </div>

                            {/* Role Selection */}
                            <div>
                                <label className="block text-sm underline font-medium text-gray-900 mb-3">
                                    Choose your role:
                                </label>
                                <div className="space-y-2">
                                    <RoleOption
                                        role="contributor"
                                        label="Contributor"
                                        description="Find good first issues and get help contributing"
                                        selected={selectedRole === "contributor"}
                                        onClick={() => setSelectedRole("contributor")}
                                    />
                                    {(permissions.push || permissions.admin) && (
                                        <>
                                            <RoleOption
                                                role="maintainer"
                                                label="Maintainer"
                                                description="Triage issues, review PRs, and manage the project"
                                                selected={selectedRole === "maintainer"}
                                                onClick={() => setSelectedRole("maintainer")}
                                            />
                                            <RoleOption
                                                role="both"
                                                label="Both"
                                                description="Access all features for contributors and maintainers"
                                                selected={selectedRole === "both"}
                                                onClick={() => setSelectedRole("both")}
                                            />
                                        </>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleCreateWorkspace}
                                className="w-full py-3 bg-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 border-2 border-emerald-600   text-white font-medium rounded-lg transition-colors"
                            >
                                Create Workspace
                            </button>
                        </div>
                    )}

                    {/* Creating Step */}
                    {step === "creating" && (
                        <div className="flex flex-col items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
                            <p className="text-gray-600">Creating workspace...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

interface RoleOptionProps {
    role: string;
    label: string;
    description: string;
    selected: boolean;
    onClick: () => void;
}

function RoleOption({ label, description, selected, onClick }: RoleOptionProps) {
    return (
        <button
            onClick={onClick}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${selected
                    ? "border-emerald-700 bg-emerald-50"
                    : "border-gray-500 hover:border-gray-900"
                }`}
        >
            <div className="flex items-center gap-3">
                <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selected ? "border-emerald-500 bg-emerald-500" : "border-gray-500"
                        }`}
                >
                    {selected && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
                <div>
                    <p className="font-medium text-gray-900">{label}</p>
                    <p className="text-sm text-gray-500">{description}</p>
                </div>
            </div>
        </button>
    );
}
