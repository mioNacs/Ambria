"use client";

import * as React from "react";
import { z } from "zod";
import {
  AlertTriangle,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
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
  };

  if (!effectiveIsOpen) {
    // Keep mounted (hidden) so the workspace panel can open this interactable later.
    return <div className="hidden" />;
  }

  return (
    <section className="h-full bg-card">
      <div className="px-4 py-3 border-b border-muted-foreground/20 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/15">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="font-medium text-foreground text-sm truncate">{title}</div>
          </div>
          {instructions ? (
            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {instructions}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {persistedState.isSaving ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Saving</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="rounded-xl border border-muted-foreground/20 bg-muted/10 p-3">
          <div className="grid grid-cols-1 gap-2">
            <input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value.slice(0, MAX_TITLE))}
              placeholder="Finding title (e.g. 'Too many ad-hoc fetch() calls')"
              className={cn(
                "px-3 py-2 rounded-lg text-sm",
                "border border-muted-foreground/20 bg-card text-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary/20",
              )}
            />

            <textarea
              value={draftSummary}
              onChange={(e) => setDraftSummary(e.target.value.slice(0, MAX_SUMMARY))}
              placeholder="Summary / suggested fix (optional)"
              rows={2}
              className={cn(
                "px-3 py-2 rounded-lg text-sm resize-none",
                "border border-muted-foreground/20 bg-card text-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary/20",
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={draftSeverity}
                onChange={(e) =>
                  setDraftSeverity(e.target.value as RepoFinding["severity"]) }
                className={cn(
                  "px-3 py-2 rounded-lg text-sm",
                  "border border-muted-foreground/20 bg-card text-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-primary/20",
                )}
              >
                <option value="info">Info</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>

              <select
                value={draftStatus}
                onChange={(e) =>
                  setDraftStatus(e.target.value as RepoFinding["status"]) }
                className={cn(
                  "px-3 py-2 rounded-lg text-sm",
                  "border border-muted-foreground/20 bg-card text-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-primary/20",
                )}
              >
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            <textarea
              value={draftRefs}
              onChange={(e) => setDraftRefs(e.target.value)}
              placeholder="References (optional, one per line: file paths or URLs)"
              rows={2}
              className={cn(
                "px-3 py-2 rounded-lg text-sm resize-none",
                "border border-muted-foreground/20 bg-card text-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary/20",
              )}
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={addFinding}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
                disabled={!draftTitle.trim() && !draftSummary.trim() && !draftRefs.trim()}
              >
                <Plus className="w-4 h-4" />
                Add finding
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {findings.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No findings yet. Ask the assistant to summarize risk areas and log findings here.
            </div>
          ) : null}

          {findings.map((finding) => (
            <div
              key={finding.id}
              className={cn(
                "rounded-xl border border-muted-foreground/20 bg-card",
                "p-3 space-y-2",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <input
                    value={finding.title}
                    onChange={(e) =>
                      setFindings((prev) =>
                        prev.map((f) =>
                          f.id === finding.id
                            ? { ...f, title: e.target.value.slice(0, MAX_TITLE) }
                            : f,
                        ),
                      )
                    }
                    className={cn(
                      "w-full bg-transparent text-sm font-medium text-foreground",
                      "focus:outline-none",
                    )}
                  />

                  {finding.summary ? (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {finding.summary}
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setFindings((prev) => prev.filter((f) => f.id !== finding.id))
                  }
                  className="p-2 hover:bg-muted/50 rounded-lg transition-colors text-muted-foreground hover:text-foreground shrink-0"
                  title="Remove finding"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={finding.severity ?? "info"}
                  onChange={(e) =>
                    setFindings((prev) =>
                      prev.map((f) =>
                        f.id === finding.id
                          ? { ...f, severity: e.target.value as RepoFinding["severity"] }
                          : f,
                      ),
                    )
                  }
                  className={cn(
                    "px-2 py-1.5 rounded-lg text-xs font-medium border",
                    severityStyles(finding.severity),
                    "focus:outline-none focus:ring-2 focus:ring-primary/20",
                  )}
                >
                  <option value="info">Info</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>

                <select
                  value={finding.status ?? "open"}
                  onChange={(e) =>
                    setFindings((prev) =>
                      prev.map((f) =>
                        f.id === finding.id
                          ? { ...f, status: e.target.value as RepoFinding["status"] }
                          : f,
                      ),
                    )
                  }
                  className={cn(
                    "px-2 py-1.5 rounded-lg text-xs font-medium border",
                    statusStyles(finding.status),
                    "focus:outline-none focus:ring-2 focus:ring-primary/20",
                  )}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              <textarea
                value={finding.summary ?? ""}
                onChange={(e) =>
                  setFindings((prev) =>
                    prev.map((f) =>
                      f.id === finding.id
                        ? {
                            ...f,
                            summary:
                              e.target.value.slice(0, MAX_SUMMARY) || undefined,
                          }
                        : f,
                    ),
                  )
                }
                placeholder="Summary / suggested fix (optional)"
                rows={2}
                className={cn(
                  "w-full px-2 py-1.5 rounded-lg text-xs resize-none",
                  "border border-muted-foreground/20 bg-muted/10 text-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-primary/20",
                )}
              />

              {finding.references?.length ? (
                <div className="flex flex-wrap gap-2">
                  {finding.references.map((ref, idx) => {
                    const isLink = /^https?:\/\//.test(ref);
                    const key = `${finding.id}:${idx}`;
                    return (
                      <div
                        key={key}
                        className={cn(
                          "inline-flex items-center gap-1",
                          "px-2 py-1 rounded-lg text-xs",
                          "border border-muted-foreground/20 bg-muted/10",
                          "text-muted-foreground",
                        )}
                      >
                        <span className="truncate max-w-[14rem]">{ref}</span>
                        {isLink ? (
                          <a
                            href={ref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                            title="Open link"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
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
