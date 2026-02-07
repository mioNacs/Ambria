"use client";


import { useWorkspaces } from "@/hooks/useWorkspaces";
import { cn } from "@/lib/utils";
import { Check, Loader2, Shield, AlertCircle } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

export const addWorkspaceCardSchema = z.object({
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    url: z.string().describe("Repository URL"),
    detectedAccess: z.enum(["read", "write", "admin"]).describe("Detected permissions on the repo"),
    stars: z.number().optional(),
    language: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
});

export type AddWorkspaceCardProps = z.infer<typeof addWorkspaceCardSchema>;

export function AddWorkspaceCard({
    owner,
    repo,
    url,
    detectedAccess,
    stars,
    language,
    description,
}: AddWorkspaceCardProps) {
    const [selectedRole, setSelectedRole] = useState<"contributor" | "maintainer" | "both">("contributor");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const { createWorkspace } = useWorkspaces();

    // Determine allowed roles based on access
    const canBeMaintainer = detectedAccess === "write" || detectedAccess === "admin";

    const handleCreate = async () => {
        setIsSubmitting(true);
        setError(null);

        try {
            await createWorkspace({
                repo_owner: owner,
                repo_name: repo,
                repo_url: url,
                role: selectedRole,
                detected_access: detectedAccess,
                repo_stars: stars,
                repo_language: language,
                repo_description: description,
            });
            setIsSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create workspace");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-300">
                    <Check className="w-5 h-5" />
                    <div className="font-medium">Workspace added successfully!</div>
                </div>
                <div className="mt-2 text-sm text-emerald-600/80 dark:text-emerald-400/80 ml-8">
                    Added {owner}/{repo} as <strong>{selectedRole}</strong>.
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-border bg-background p-4 space-y-4 max-w-md my-2">
            <div className="space-y-1">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    Add Workspace
                </h3>
                <p className="text-sm text-muted-foreground">
                    Select your role for <span className="font-medium text-foreground">{owner}/{repo}</span>
                </p>
            </div>

            <div className="space-y-3">
                {/* Role Options */}
                <div className="space-y-2">
                    <RoleOption
                        id="contributor"
                        title="Contributor"
                        description="Find issues and submit PRs"
                        isSelected={selectedRole === "contributor"}
                        onSelect={() => setSelectedRole("contributor")}
                    />

                    {canBeMaintainer && (
                        <>
                            <RoleOption
                                id="maintainer"
                                title="Maintainer"
                                description="Triage issues and review PRs"
                                isSelected={selectedRole === "maintainer"}
                                onSelect={() => setSelectedRole("maintainer")}
                            />
                            <RoleOption
                                id="both"
                                title="Both"
                                description="Full access to all tools"
                                isSelected={selectedRole === "both"}
                                onSelect={() => setSelectedRole("both")}
                            />
                        </>
                    )}
                </div>

                {/* Warning if higher role requested but not available (Edge case handling) */}
                {!canBeMaintainer && (
                    <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                        Note: You only have read access, so you can only join as a Contributor.
                    </div>
                )}
            </div>

            {error && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            <button
                onClick={handleCreate}
                disabled={isSubmitting}
                className={cn(
                    "w-full flex items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-all hover:opacity-90",
                    isSubmitting && "opacity-50 cursor-not-allowed"
                )}
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Adding...
                    </>
                ) : (
                    "Confirm & Add Workspace"
                )}
            </button>
        </div>
    );
}

function RoleOption({
    id,
    title,
    description,
    isSelected,
    onSelect
}: {
    id: string;
    title: string;
    description: string;
    isSelected: boolean;
    onSelect: () => void
}) {
    return (
        <div
            onClick={onSelect}
            className={cn(
                "flex items-center p-3 rounded-lg border cursor-pointer transition-all hover:bg-muted/50",
                isSelected ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 ring-1 ring-emerald-500" : "border-border"
            )}
        >
            <div className={cn(
                "w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center flex-shrink-0",
                isSelected ? "border-emerald-500" : "border-muted-foreground"
            )}>
                {isSelected && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
            </div>
            <div>
                <div className="text-sm font-medium text-foreground">{title}</div>
                <div className="text-xs text-muted-foreground">{description}</div>
            </div>
        </div>
    )
}
