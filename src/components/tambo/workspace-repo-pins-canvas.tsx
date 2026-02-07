"use client";

import * as React from "react";
import { z } from "zod";
import {
  Bookmark,
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

const pinSchema = z.object({
  id: z.string(),
  kind: z.enum(["issue", "pull_request", "file", "discussion", "other"]),
  title: z.string().max(200),
  url: z.string().max(1024).optional(),
  note: z.string().max(5000).optional(),
  status: z.enum(["todo", "watching", "blocked", "done"]).optional(),
});

export const repoPinsCanvasPropsSchema = z.object({
  title: z.string(),
  instructions: z.string().optional(),
  workspaceId: z.string().optional(),
  defaultOpen: z.boolean().optional(),
});

export const repoPinsCanvasStateSchema = z.object({
  isOpen: z.boolean().optional(),
  pins: z.array(pinSchema).max(75),
});

type RepoPinsCanvasProps = z.infer<typeof repoPinsCanvasPropsSchema>;
type RepoPin = z.infer<typeof pinSchema>;

const MAX_TITLE = 200;
const MAX_URL = 1024;
const MAX_NOTE = 5000;

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

function guessPinKind(url: string): RepoPin["kind"] {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com" && !parsed.hostname.endsWith(".github.com")) {
      return "other";
    }
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length >= 4 && parts[2] === "issues") return "issue";
    if (parts.length >= 4 && parts[2] === "pull") return "pull_request";
    if (parts.length >= 5 && parts[2] === "blob") return "file";
    if (parts.length >= 4 && parts[2] === "discussions") return "discussion";
  } catch {
    // ignore
  }
  return "other";
}

function guessPinTitle(url: string, kind: RepoPin["kind"]) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com" && !parsed.hostname.endsWith(".github.com")) {
      return "Pinned link";
    }
    const parts = parsed.pathname.split("/").filter(Boolean);
    if ((kind === "issue" || kind === "pull_request") && parts.length >= 4) {
      const number = parts[3];
      return `#${number}`;
    }

    if (kind === "file" && parts.length >= 5) {
      return parts.slice(4).join("/");
    }
  } catch {
    // ignore
  }

  return "Pinned link";
}

function kindLabel(kind: RepoPin["kind"]) {
  switch (kind) {
    case "issue":
      return "Issue";
    case "pull_request":
      return "PR";
    case "file":
      return "File";
    case "discussion":
      return "Discussion";
    default:
      return "Other";
  }
}

function statusStyles(status: RepoPin["status"]) {
  switch (status) {
    case "todo":
      return "bg-muted/30 border-muted-foreground/20 text-muted-foreground";
    case "watching":
      return "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400";
    case "blocked":
      return "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400";
    case "done":
      return "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400";
    default:
      return "bg-muted/30 border-muted-foreground/20 text-muted-foreground";
  }
}

function RepoPinsCanvasBase({
  title,
  instructions,
  workspaceId,
  defaultOpen,
}: RepoPinsCanvasProps) {
  // `defaultOpen` is only used to seed the initial value; `state.isOpen` is the source of truth after that.
  const [isOpen] = useTamboComponentState<boolean>(
    "isOpen",
    defaultOpen ?? false,
  );
  const effectiveIsOpen = typeof isOpen === "boolean" ? isOpen : (defaultOpen ?? false);

  const initialPins = React.useMemo<RepoPin[]>(() => [], []);
  const persistedState = useWorkspaceJsonArrayPersistence<RepoPin>(
    workspaceId,
    "repo_pins",
    initialPins,
  );

  const [tamboPins, setTamboPins] = useTamboComponentState<RepoPin[]>(
    "pins",
    initialPins,
  );
  const usePersistence = !!workspaceId;

  const prevTamboPinsRef = React.useRef<string | null>(null);
  const hasSyncedFromDbRef = React.useRef(false);

  React.useEffect(() => {
    if (usePersistence && !persistedState.isLoading && !hasSyncedFromDbRef.current) {
      setTamboPins(persistedState.items);
      prevTamboPinsRef.current = JSON.stringify(persistedState.items);
      hasSyncedFromDbRef.current = true;
    }
  }, [persistedState.items, persistedState.isLoading, setTamboPins, usePersistence]);

  React.useEffect(() => {
    if (!usePersistence || !hasSyncedFromDbRef.current) return;

    const safePins = tamboPins ?? initialPins;
    const json = JSON.stringify(safePins);
    const prev = prevTamboPinsRef.current;

    if (prev !== null && json !== prev) {
      persistedState.setItems(safePins);
    }

    prevTamboPinsRef.current = json;
  }, [initialPins, tamboPins, usePersistence, persistedState]);

  const pins = usePersistence ? persistedState.items : (tamboPins ?? initialPins);

  const setPins = (updater: RepoPin[] | ((prev: RepoPin[]) => RepoPin[])) => {
    if (usePersistence) {
      const next =
        typeof updater === "function" ? updater(persistedState.items) : updater;
      persistedState.setItems(next);
      setTamboPins(next);
      prevTamboPinsRef.current = JSON.stringify(next);
      return;
    }

    const next =
      typeof updater === "function" ? updater(tamboPins ?? initialPins) : updater;
    setTamboPins(next);
  };

  const [showAddForm, setShowAddForm] = React.useState(false);
  const [draftUrl, setDraftUrl] = React.useState("");
  const [draftTitle, setDraftTitle] = React.useState("");
  const [draftNote, setDraftNote] = React.useState("");
  const [draftStatus, setDraftStatus] = React.useState<RepoPin["status"]>("todo");

  const addPin = () => {
    const url = draftUrl.trim();
    const kind = url ? guessPinKind(url) : "other";
    const title = (draftTitle || (url ? guessPinTitle(url, kind) : "Pin")).trim();
    const safeUrl = url ? url.slice(0, MAX_URL) : "";

    const nextPin: RepoPin = {
      id: createClientId("pin"),
      kind,
      title: (title || "Pinned link").slice(0, MAX_TITLE),
      url: safeUrl || undefined,
      note: (draftNote.trim().slice(0, MAX_NOTE) || undefined) ?? undefined,
      status: draftStatus,
    };

    setPins((prev) => [nextPin, ...prev].slice(0, 75));
    setDraftUrl("");
    setDraftTitle("");
    setDraftNote("");
    setDraftStatus("todo");
    setShowAddForm(false);
  };

  return (
    // Keep mounted (hidden) so the workspace panel can open this interactable later.
    <section hidden={!effectiveIsOpen} aria-hidden={!effectiveIsOpen} className="h-full bg-background">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Bookmark className="w-5 h-5" />
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

          <div className="flex items-center gap-3">
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
                  Add pin
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-y-auto h-[calc(100%-73px)]">
        <div className="p-6 space-y-6">
          {/* Add Pin Form - Collapsible */}
          {showAddForm && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <div className="rounded-xl border border-border bg-card shadow-lg p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <div className="w-1 h-4 bg-primary rounded-full" />
                  New Pin
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      GitHub URL
                    </label>
                    <input
                      value={draftUrl}
                      onChange={(e) => setDraftUrl(e.target.value.slice(0, MAX_URL))}
                      placeholder="https://github.com/owner/repo/issues/123"
                      className={cn(
                        "w-full px-3 py-2.5 rounded-lg text-sm font-mono",
                        "border border-input bg-background text-foreground",
                        "placeholder:text-muted-foreground/60",
                        "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
                        "transition-all duration-200",
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                        Title
                      </label>
                      <input
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value.slice(0, MAX_TITLE))}
                        placeholder="Auto-generated from URL if left empty"
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
                        Status
                      </label>
                      <select
                        value={draftStatus}
                        onChange={(e) =>
                          setDraftStatus(e.target.value as RepoPin["status"]) }
                        className={cn(
                          "w-full px-3 py-2.5 rounded-lg text-sm",
                          "border border-input bg-background text-foreground",
                          "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
                          "transition-all duration-200 cursor-pointer",
                        )}
                      >
                        <option value="todo">📋 Todo</option>
                        <option value="watching">👀 Watching</option>
                        <option value="blocked">🚫 Blocked</option>
                        <option value="done">✅ Done</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Notes
                    </label>
                    <textarea
                      value={draftNote}
                      onChange={(e) => setDraftNote(e.target.value.slice(0, MAX_NOTE))}
                      placeholder="Add context, next steps, or reminders..."
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

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setDraftUrl("");
                        setDraftTitle("");
                        setDraftNote("");
                        setDraftStatus("todo");
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
                      onClick={addPin}
                      className={cn(
                        "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                        "bg-primary text-primary-foreground hover:bg-primary/90",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "transition-all duration-200 shadow-sm hover:shadow-md",
                      )}
                      disabled={!draftUrl.trim() && !draftTitle.trim()}
                    >
                      <Plus className="w-4 h-4" />
                      Add Pin
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pins List */}
          <div className="space-y-4">
            {pins.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                  <Bookmark className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  No pins yet. Click <strong>Add pin</strong> above or ask the assistant to track important issues, PRs, or files.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">
                    {pins.length} {pins.length === 1 ? 'pin' : 'pins'}
                  </p>
                </div>

                {pins.map((pin) => (
                  <PinCard
                    key={pin.id}
                    pin={pin}
                    onUpdate={(updates) =>
                      setPins((prev) =>
                        prev.map((p) =>
                          p.id === pin.id ? { ...p, ...updates } : p
                        )
                      )
                    }
                    onDelete={() =>
                      setPins((prev) => prev.filter((p) => p.id !== pin.id))
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

interface PinCardProps {
  pin: RepoPin;
  onUpdate: (updates: Partial<RepoPin>) => void;
  onDelete: () => void;
}

function PinCard({ pin, onUpdate, onDelete }: PinCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div
      className={cn(
        "group rounded-xl border bg-card",
        "transition-all duration-200",
        "hover:shadow-md hover:border-primary/20",
        statusStyles(pin.status),
      )}
    >
      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <span
                className={cn(
                  "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border",
                  "bg-muted/50 border-muted-foreground/30 text-muted-foreground",
                )}
              >
                {kindLabel(pin.kind)}
              </span>
              <span
                className={cn(
                  "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border",
                  statusStyles(pin.status),
                )}
              >
                {pin.status === "todo"
                  ? "Todo"
                  : pin.status === "watching"
                    ? "Watching"
                    : pin.status === "blocked"
                      ? "Blocked"
                      : "Done"}
              </span>
            </div>

            {!isExpanded ? (
              <>
                <h3 className="text-base font-semibold text-foreground leading-snug">
                  {pin.title}
                </h3>
                {pin.url && (
                  <a
                    href={pin.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 text-xs text-primary hover:underline truncate block font-mono"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {pin.url}
                  </a>
                )}
                {pin.note && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {pin.note}
                  </p>
                )}
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {pin.url && !isExpanded && (
              <a
                href={pin.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors text-primary"
                title="Open link"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
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
              title="Delete pin"
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
              Title
            </label>
            <input
              value={pin.title}
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
              placeholder="Enter pin title..."
            />
          </div>

          {/* URL Editor */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
              <div className="w-1 h-3.5 bg-primary rounded-full" />
              URL
            </label>
            <div className="relative">
              <input
                value={pin.url ?? ""}
                onChange={(e) =>
                  onUpdate({ url: e.target.value.slice(0, MAX_URL) || undefined })
                }
                className={cn(
                  "w-full px-3.5 py-2.5 rounded-lg text-sm font-mono",
                  "border-2 border-border bg-card text-foreground",
                  "placeholder:text-muted-foreground/60",
                  "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary",
                  "transition-all duration-200",
                  "shadow-sm hover:shadow-md",
                  pin.url ? "pr-10" : "",
                )}
                placeholder="https://github.com/..."
              />
              {pin.url && (
                <a
                  href={pin.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-primary/10 text-primary"
                  title="Open in new tab"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Note Editor */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
              <div className="w-1 h-3.5 bg-primary rounded-full" />
              Notes
            </label>
            <div className="relative">
              <textarea
                value={pin.note ?? ""}
                onChange={(e) =>
                  onUpdate({
                    note: e.target.value.slice(0, MAX_NOTE) || undefined,
                  })
                }
                placeholder="Add context, next steps, or reminders..."
                rows={4}
                className={cn(
                  "w-full px-3.5 py-3 rounded-lg text-sm resize-y min-h-[100px]",
                  "border-2 border-border bg-card text-foreground leading-relaxed",
                  "placeholder:text-muted-foreground/60",
                  "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary",
                  "transition-all duration-200",
                  "shadow-sm hover:shadow-md",
                )}
              />
              <div className="absolute bottom-2 right-2 text-xs text-muted-foreground/60 bg-card/80 px-2 py-0.5 rounded">
                {(pin.note ?? "").length} / {MAX_NOTE}
              </div>
            </div>
          </div>

          <div className="h-px bg-border/50" />

          {/* Status */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-2 block">
              Status
            </label>
            <select
              value={pin.status ?? "todo"}
              onChange={(e) =>
                onUpdate({ status: e.target.value as RepoPin["status"] })
              }
              className={cn(
                "w-full px-3 py-2 rounded-lg text-sm font-medium border-2",
                statusStyles(pin.status),
                "focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer",
                "transition-all duration-200",
                "shadow-sm hover:shadow-md",
              )}
            >
              <option value="todo">📋 Todo</option>
              <option value="watching">👀 Watching</option>
              <option value="blocked">🚫 Blocked</option>
              <option value="done">✅ Done</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

const repoPinsCanvasConfig: InteractableConfig<RepoPinsCanvasProps> = {
  componentName: "RepoPinsCanvas",
  description:
    "A persistent pins board for tracking important GitHub items (issues, pull requests, files, discussions) with a status and notes. Tambo can add, edit, or remove pins and update their status. Use props.defaultOpen for initial visibility; use state.isOpen to show/hide after initialization.",
  propsSchema: repoPinsCanvasPropsSchema,
  stateSchema: repoPinsCanvasStateSchema,
};

export const RepoPinsCanvas = withInteractable(RepoPinsCanvasBase, repoPinsCanvasConfig);
