"use client";

import * as React from "react";
import { z } from "zod";
import {
  AlertTriangle,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useTamboComponentState, withInteractable } from "@tambo-ai/react";
import type { InteractableConfig } from "@tambo-ai/react";
import { cn } from "@/lib/utils";
import { useWorkspaceJsonArrayPersistence } from "@/hooks/useWorkspaceJsonArrayPersistence";

const findingSchema = z.object({
  id: z.string(),
  title: z.string().max(200),
  summary: z.string().max(8000).optional(),
  severity: z.enum(["info", "low", "medium", "high"]).optional(),
  status: z.enum(["open", "in_progress", "resolved"]).optional(),
  references: z.array(z.string().max(512)).max(10).optional(),
});

export const repoFindingsCanvasPropsSchema = z.object({
  title: z.string(),
  instructions: z.string().optional(),
  workspaceId: z.string().optional(),
  defaultOpen: z.boolean().optional(),
});

export const repoFindingsCanvasStateSchema = z.object({
  isOpen: z.boolean().optional(),
  findings: z.array(findingSchema).max(75),
});

type RepoFindingsCanvasProps = z.infer<typeof repoFindingsCanvasPropsSchema>;
type RepoFinding = z.infer<typeof findingSchema>;

const MAX_TITLE = 200;
const MAX_SUMMARY = 8000;
const MAX_REF = 512;

function createClientId(prefix: string) {
  if (typeof crypto !== "undefined") {
    const cryptoApi = crypto as {
      randomUUID?: () => string;
      getRandomValues?: (array: Uint8Array) => Uint8Array;
    };

    if (typeof cryptoApi.randomUUID === "function") {
      return `${prefix}_${cryptoApi.randomUUID()}`;
    }

    if (typeof cryptoApi.getRandomValues === "function") {
      const bytes = new Uint8Array(16);
      cryptoApi.getRandomValues(bytes);
      const hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      return `${prefix}_${hex}`;
    }
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function severityStyles(severity: RepoFinding["severity"]) {
  switch (severity) {
    case "high":
      return "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400";
    case "medium":
      return "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400";
    case "low":
      return "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400";
    case "info":
    default:
      return "bg-muted/30 border-muted-foreground/20 text-muted-foreground";
  }
}

function statusStyles(status: RepoFinding["status"]) {
  switch (status) {
    case "resolved":
      return "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400";
    case "in_progress":
      return "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400";
    case "open":
    default:
      return "bg-muted/30 border-muted-foreground/20 text-muted-foreground";
  }
}

function RepoFindingsCanvasBase({
  title,
  instructions,
  workspaceId,
  defaultOpen,
}: RepoFindingsCanvasProps) {
  // `defaultOpen` is only used to seed the initial value; `state.isOpen` is the source of truth after that.
  const [isOpen] = useTamboComponentState<boolean>(
    "isOpen",
    defaultOpen ?? false,
  );
  const effectiveIsOpen = typeof isOpen === "boolean" ? isOpen : (defaultOpen ?? false);

  const initialFindings = React.useMemo<RepoFinding[]>(() => [], []);
  const persistedState = useWorkspaceJsonArrayPersistence<RepoFinding>(
    workspaceId,
    "repo_findings",
    initialFindings,
  );

  const [tamboFindings, setTamboFindings] = useTamboComponentState<RepoFinding[]>(
    "findings",
    initialFindings,
  );
  const usePersistence = !!workspaceId;

  const prevTamboFindingsRef = React.useRef<string | null>(null);
  const hasSyncedFromDbRef = React.useRef(false);

  React.useEffect(() => {
    if (usePersistence && !persistedState.isLoading && !hasSyncedFromDbRef.current) {
      setTamboFindings(persistedState.items);
      prevTamboFindingsRef.current = JSON.stringify(persistedState.items);
      hasSyncedFromDbRef.current = true;
    }
  }, [persistedState.items, persistedState.isLoading, setTamboFindings, usePersistence]);

  React.useEffect(() => {
    if (!usePersistence || !hasSyncedFromDbRef.current) return;

    const safeFindings = tamboFindings ?? initialFindings;
    const json = JSON.stringify(safeFindings);
    const prev = prevTamboFindingsRef.current;

    if (prev !== null && json !== prev) {
      persistedState.setItems(safeFindings);
    }

    prevTamboFindingsRef.current = json;
  }, [initialFindings, tamboFindings, usePersistence, persistedState]);

  const findings = usePersistence
    ? persistedState.items
    : (tamboFindings ?? initialFindings);

  const setFindings = (
    updater: RepoFinding[] | ((prev: RepoFinding[]) => RepoFinding[]),
  ) => {
    if (usePersistence) {
      const next =
        typeof updater === "function" ? updater(persistedState.items) : updater;
      persistedState.setItems(next);
      setTamboFindings(next);
      prevTamboFindingsRef.current = JSON.stringify(next);
      return;
    }

    const next =
      typeof updater === "function"
        ? updater(tamboFindings ?? initialFindings)
        : updater;
    setTamboFindings(next);
  };

  const [showAddForm, setShowAddForm] = React.useState(false);
  const [draftTitle, setDraftTitle] = React.useState("");
  const [draftSummary, setDraftSummary] = React.useState("");
  const [draftSeverity, setDraftSeverity] = React.useState<RepoFinding["severity"]>(
    "info",
  );
  const [draftStatus, setDraftStatus] = React.useState<RepoFinding["status"]>("open");
  const [draftRefs, setDraftRefs] = React.useState("");

  const addFinding = () => {
    const nextFinding: RepoFinding = {
      id: createClientId("finding"),
      title: (draftTitle.trim() || "Finding").slice(0, MAX_TITLE),
      summary: draftSummary.trim().slice(0, MAX_SUMMARY) || undefined,
      severity: draftSeverity,
      status: draftStatus,
      references: draftRefs
        .split("\n")
        .map((v) => v.trim().slice(0, MAX_REF))
        .filter(Boolean)
        .slice(0, 10),
    };

    setFindings((prev) => [nextFinding, ...prev].slice(0, 75));
    setDraftTitle("");
    setDraftSummary("");
    setDraftSeverity("info");
    setDraftStatus("open");
    setDraftRefs("");
    setShowAddForm(false);
  };

  return (
    // Keep mounted (hidden) so the workspace panel can open this interactable later.
    <section
      hidden={!effectiveIsOpen}
      aria-hidden={!effectiveIsOpen}
      className="h-full bg-background flex flex-col"
    >
      {/* Header */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground text-base">{title}</h2>
              {instructions ? (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {instructions}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {persistedState.isSaving ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-3 py-1.5 rounded-full bg-muted/30">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Saving...</span>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                "transition-all duration-200",
                showAddForm
                  ? "bg-muted text-muted-foreground hover:bg-muted/80"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md",
              )}
            >
              {showAddForm ? (
                <>
                  <X className="w-4 h-4" />
                  Cancel
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add finding
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6 space-y-6">
          {/* Add Finding Form - Collapsible */}
          {showAddForm && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <div className="rounded-xl border border-border bg-card shadow-lg p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <div className="w-1 h-4 bg-primary rounded-full" />
                  New Finding
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value.slice(0, MAX_TITLE))}
                      placeholder="e.g., 'Too many ad-hoc fetch() calls' or 'Missing error handling'"
                      className={cn(
                        "w-full px-3 py-2.5 rounded-lg text-sm",
                        "border border-input bg-background text-foreground",
                        "placeholder:text-muted-foreground/60",
                        "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
                        "transition-all duration-200",
                      )}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Summary / Suggested Fix
                    </label>
                    <textarea
                      value={draftSummary}
                      onChange={(e) => setDraftSummary(e.target.value.slice(0, MAX_SUMMARY))}
                      placeholder="Describe the issue and potential solutions..."
                      rows={3}
                      className={cn(
                        "w-full px-3 py-2.5 rounded-lg text-sm resize-none",
                        "border border-input bg-background text-foreground",
                        "placeholder:text-muted-foreground/60",
                        "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
                        "transition-all duration-200",
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                        Severity
                      </label>
                      <select
                        value={draftSeverity}
                        onChange={(e) =>
                          setDraftSeverity(e.target.value as RepoFinding["severity"]) }
                        className={cn(
                          "w-full px-3 py-2.5 rounded-lg text-sm",
                          "border border-input bg-background text-foreground",
                          "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
                          "transition-all duration-200 cursor-pointer",
                        )}
                      >
                        <option value="info">Info</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                        Status
                      </label>
                      <select
                        value={draftStatus}
                        onChange={(e) =>
                          setDraftStatus(e.target.value as RepoFinding["status"]) }
                        className={cn(
                          "w-full px-3 py-2.5 rounded-lg text-sm",
                          "border border-input bg-background text-foreground",
                          "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
                          "transition-all duration-200 cursor-pointer",
                        )}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      References
                    </label>
                    <textarea
                      value={draftRefs}
                      onChange={(e) => setDraftRefs(e.target.value)}
                      placeholder="One per line: file paths or URLs&#10;e.g., src/api/users.ts&#10;https://example.com/docs"
                      rows={3}
                      className={cn(
                        "w-full px-3 py-2.5 rounded-lg text-sm resize-none font-mono",
                        "border border-input bg-background text-foreground",
                        "placeholder:text-muted-foreground/60",
                        "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
                        "transition-all duration-200",
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setDraftTitle("");
                        setDraftSummary("");
                        setDraftSeverity("info");
                        setDraftStatus("open");
                        setDraftRefs("");
                      }}
                      className={cn(
                        "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                        "bg-muted text-muted-foreground hover:bg-muted/80",
                        "transition-colors duration-200",
                      )}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={addFinding}
                      className={cn(
                        "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                        "bg-primary text-primary-foreground hover:bg-primary/90",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "transition-all duration-200 shadow-sm hover:shadow-md",
                      )}
                      disabled={!draftTitle.trim()}
                    >
                      <Plus className="w-4 h-4" />
                      Add Finding
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Findings List */}
          <div className="space-y-4">
            {findings.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                  <AlertTriangle className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  No findings yet. Click <strong>Add finding</strong> above or ask the assistant to analyze and log potential issues.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">
                    {findings.length} {findings.length === 1 ? 'finding' : 'findings'}
                  </p>
                </div>

                {findings.map((finding) => (
                  <FindingCard
                    key={finding.id}
                    finding={finding}
                    onUpdate={(updates) =>
                      setFindings((prev) =>
                        prev.map((f) =>
                          f.id === finding.id ? { ...f, ...updates } : f
                        )
                      )
                    }
                    onDelete={() =>
                      setFindings((prev) => prev.filter((f) => f.id !== finding.id))
                    }
                  />
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

interface FindingCardProps {
  finding: RepoFinding;
  onUpdate: (updates: Partial<RepoFinding>) => void;
  onDelete: () => void;
}

function FindingCard({ finding, onUpdate, onDelete }: FindingCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div
      className={cn(
        "group rounded-xl border bg-card",
        "transition-all duration-200",
        "hover:shadow-md hover:border-primary/20",
        severityStyles(finding.severity),
      )}
    >
      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-3">
              <div className="flex gap-2 flex-wrap">
                <span
                  className={cn(
                    "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border",
                    severityStyles(finding.severity),
                  )}
                >
                  {(finding.severity ?? "info").toUpperCase()}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border",
                    statusStyles(finding.status),
                  )}
                >
                  {finding.status === "in_progress"
                    ? "In Progress"
                    : (finding.status ?? "open").charAt(0).toUpperCase() +
                      (finding.status ?? "open").slice(1)}
                </span>
              </div>
            </div>

            {!isExpanded ? (
              <>
                <h3 className="text-base font-semibold text-foreground leading-snug">
                  {finding.title}
                </h3>
                {finding.summary && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {finding.summary}
                  </p>
                )}
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                isExpanded
                  ? "bg-primary/10 text-primary hover:bg-primary/20"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors text-muted-foreground hover:text-destructive"
              title="Delete finding"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-5 border-t border-border/50 pt-5 animate-in slide-in-from-top-1 duration-200 bg-muted/20">
          {/* Title Editor */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
              <div className="w-1 h-3.5 bg-primary rounded-full" />
              Finding Title
            </label>
            <input
              value={finding.title}
              onChange={(e) =>
                onUpdate({ title: e.target.value.slice(0, MAX_TITLE) })
              }
              className={cn(
                "w-full px-3.5 py-2.5 rounded-lg text-sm font-medium",
                "border-2 border-border bg-card text-foreground",
                "placeholder:text-muted-foreground/60",
                "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary",
                "transition-all duration-200",
                "shadow-sm hover:shadow-md",
              )}
              placeholder="Enter finding title..."
            />
          </div>

          {/* Summary Editor */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
              <div className="w-1 h-3.5 bg-primary rounded-full" />
              Summary / Suggested Fix
            </label>
            <div className="relative">
              <textarea
                value={finding.summary ?? ""}
                onChange={(e) =>
                  onUpdate({
                    summary: e.target.value.slice(0, MAX_SUMMARY) || undefined,
                  })
                }
                placeholder="Describe the issue in detail and suggest potential solutions or remediation steps..."
                rows={5}
                className={cn(
                  "w-full px-3.5 py-3 rounded-lg text-sm resize-y min-h-[120px]",
                  "border-2 border-border bg-card text-foreground leading-relaxed",
                  "placeholder:text-muted-foreground/60",
                  "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary",
                  "transition-all duration-200",
                  "shadow-sm hover:shadow-md",
                )}
              />
              <div className="absolute bottom-2 right-2 text-xs text-muted-foreground/60 bg-card/80 px-2 py-0.5 rounded">
                {(finding.summary ?? "").length} / {MAX_SUMMARY}
              </div>
            </div>
          </div>

          <div className="h-px bg-border/50" />

          {/* Severity & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-2 block">
                Severity Level
              </label>
              <select
                value={finding.severity ?? "info"}
                onChange={(e) =>
                  onUpdate({ severity: e.target.value as RepoFinding["severity"] })
                }
                className={cn(
                  "w-full px-3 py-2 rounded-lg text-sm font-medium border-2",
                  severityStyles(finding.severity),
                  "focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer",
                  "transition-all duration-200",
                  "shadow-sm hover:shadow-md",
                )}
              >
                <option value="info">ℹ️ Info</option>
                <option value="low">🔵 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🔴 High</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-2 block">
                Status
              </label>
              <select
                value={finding.status ?? "open"}
                onChange={(e) =>
                  onUpdate({ status: e.target.value as RepoFinding["status"] })
                }
                className={cn(
                  "w-full px-3 py-2 rounded-lg text-sm font-medium border-2",
                  statusStyles(finding.status),
                  "focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer",
                  "transition-all duration-200",
                  "shadow-sm hover:shadow-md",
                )}
              >
                <option value="open">📋 Open</option>
                <option value="in_progress">⚙️ In Progress</option>
                <option value="resolved">✅ Resolved</option>
              </select>
            </div>
          </div>

          {/* References */}
          {finding.references?.length ? (
            <div>
              <label className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
                <div className="w-1 h-3.5 bg-primary rounded-full" />
                References ({finding.references.length})
              </label>
              <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-card border border-border">
                {finding.references.map((ref, idx) => {
                  const isLink = /^https?:\/\//.test(ref);
                  const key = `${finding.id}:${idx}`;
                  return (
                    <div
                      key={key}
                      className={cn(
                        "inline-flex items-center gap-2",
                        "px-3 py-2 rounded-lg",
                        "border border-border bg-muted/50",
                        "text-foreground font-mono text-xs",
                        "hover:bg-muted transition-all hover:shadow-sm",
                      )}
                    >
                      <span className="truncate max-w-[18rem]">{ref}</span>
                      {isLink && (
                        <a
                          href={ref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded hover:bg-primary/20 text-primary transition-colors"
                          title="Open in new tab"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

const repoFindingsCanvasConfig: InteractableConfig<RepoFindingsCanvasProps> = {
  componentName: "RepoFindingsCanvas",
  description:
    "A persistent findings log for repo analysis. Each finding can have a title, severity, status, summary, and references (file paths or URLs). Tambo can add/update findings and mark them resolved. Use props.defaultOpen for initial visibility; use state.isOpen to show/hide after initialization.",
  propsSchema: repoFindingsCanvasPropsSchema,
  stateSchema: repoFindingsCanvasStateSchema,
};

export const RepoFindingsCanvas = withInteractable(
  RepoFindingsCanvasBase,
  repoFindingsCanvasConfig,
);
