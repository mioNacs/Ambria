"use client";

import * as React from "react";
import { z } from "zod";
import {
  Bookmark,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useTamboComponentState, withInteractable } from "@tambo-ai/react";
import type { InteractableConfig } from "@tambo-ai/react";
import { cn } from "@/lib/utils";
import { useWorkspaceJsonArrayPersistence } from "@/hooks/useWorkspaceJsonArrayPersistence";

const pinSchema = z.object({
  id: z.string(),
  kind: z.enum(["issue", "pull_request", "file", "discussion", "other"]),
  title: z.string(),
  url: z.string().url().optional(),
  note: z.string().optional(),
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

  return "Pin";
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
  const [isOpen] = useTamboComponentState<boolean>(
    "isOpen",
    defaultOpen ?? false,
  );

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

  const [draftUrl, setDraftUrl] = React.useState("");
  const [draftTitle, setDraftTitle] = React.useState("");
  const [draftNote, setDraftNote] = React.useState("");
  const [draftStatus, setDraftStatus] = React.useState<RepoPin["status"]>("todo");

  const addPin = () => {
    const url = draftUrl.trim();
    const kind = url ? guessPinKind(url) : "other";
    const title = (draftTitle || (url ? guessPinTitle(url, kind) : "Pin")).trim();

    const nextPin: RepoPin = {
      id: createClientId("pin"),
      kind,
      title: title || "Pin",
      url: url || undefined,
      note: draftNote.trim() || undefined,
      status: draftStatus,
    };

    setPins((prev) => [nextPin, ...prev].slice(0, 75));
    setDraftUrl("");
    setDraftTitle("");
    setDraftNote("");
    setDraftStatus("todo");
  };

  if (!isOpen) {
    return null;
  }

  return (
    <section className="h-full bg-card">
      <div className="px-4 py-3 border-b border-muted-foreground/20 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-muted/40 text-muted-foreground">
              <Bookmark className="w-4 h-4" />
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
              value={draftUrl}
              onChange={(e) => setDraftUrl(e.target.value)}
              placeholder="Paste a GitHub URL (issue, PR, file)…"
              className={cn(
                "px-3 py-2 rounded-lg text-sm",
                "border border-muted-foreground/20 bg-card text-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary/20",
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Title (optional)"
                className={cn(
                  "sm:col-span-2 px-3 py-2 rounded-lg text-sm",
                  "border border-muted-foreground/20 bg-card text-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-primary/20",
                )}
              />

              <select
                value={draftStatus ?? "todo"}
                onChange={(e) =>
                  setDraftStatus(e.target.value as RepoPin["status"]) }
                className={cn(
                  "px-3 py-2 rounded-lg text-sm",
                  "border border-muted-foreground/20 bg-card text-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-primary/20",
                )}
              >
                <option value="todo">Todo</option>
                <option value="watching">Watching</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
              </select>
            </div>

            <textarea
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              placeholder="Note (optional)"
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
                onClick={addPin}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
                disabled={!draftUrl.trim() && !draftTitle.trim() && !draftNote.trim()}
              >
                <Plus className="w-4 h-4" />
                Add pin
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {pins.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No pins yet. Ask the assistant to add issues/PRs/files you want to track.
            </div>
          ) : null}

          {pins.map((pin) => (
            <div
              key={pin.id}
              className={cn(
                "rounded-xl border border-muted-foreground/20 bg-card",
                "p-3 space-y-2",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-[11px] px-2 py-0.5 rounded-full border",
                        "bg-muted/30 border-muted-foreground/20 text-muted-foreground",
                      )}
                    >
                      {kindLabel(pin.kind)}
                    </span>

                    <input
                      value={pin.title}
                      onChange={(e) =>
                        setPins((prev) =>
                          prev.map((p) =>
                            p.id === pin.id ? { ...p, title: e.target.value } : p,
                          ),
                        )
                      }
                      className={cn(
                        "flex-1 bg-transparent text-sm font-medium text-foreground",
                        "focus:outline-none",
                      )}
                    />
                  </div>

                  {pin.url ? (
                    <div className="mt-1 text-xs text-muted-foreground truncate">
                      {pin.url}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {pin.url ? (
                    <a
                      href={pin.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-muted/50 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                      title="Open link"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : null}

                  <button
                    type="button"
                    onClick={() =>
                      setPins((prev) => prev.filter((p) => p.id !== pin.id))
                    }
                    className="p-2 hover:bg-muted/50 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                    title="Remove pin"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={pin.status ?? "todo"}
                  onChange={(e) =>
                    setPins((prev) =>
                      prev.map((p) =>
                        p.id === pin.id
                          ? { ...p, status: e.target.value as RepoPin["status"] }
                          : p,
                      ),
                    )
                  }
                  className={cn(
                    "px-2 py-1.5 rounded-lg text-xs font-medium border",
                    statusStyles(pin.status),
                    "focus:outline-none focus:ring-2 focus:ring-primary/20",
                  )}
                >
                  <option value="todo">Todo</option>
                  <option value="watching">Watching</option>
                  <option value="blocked">Blocked</option>
                  <option value="done">Done</option>
                </select>

                <input
                  value={pin.url ?? ""}
                  onChange={(e) =>
                    setPins((prev) =>
                      prev.map((p) =>
                        p.id === pin.id
                          ? { ...p, url: e.target.value || undefined }
                          : p,
                      ),
                    )
                  }
                  placeholder="URL (optional)"
                  className={cn(
                    "sm:col-span-2 px-2 py-1.5 rounded-lg text-xs",
                    "border border-muted-foreground/20 bg-muted/10 text-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary/20",
                  )}
                />
              </div>

              <textarea
                value={pin.note ?? ""}
                onChange={(e) =>
                  setPins((prev) =>
                    prev.map((p) =>
                      p.id === pin.id
                        ? { ...p, note: e.target.value || undefined }
                        : p,
                    ),
                  )
                }
                placeholder="Note (optional)"
                rows={2}
                className={cn(
                  "w-full px-2 py-1.5 rounded-lg text-xs resize-none",
                  "border border-muted-foreground/20 bg-muted/10 text-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-primary/20",
                )}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const repoPinsCanvasConfig: InteractableConfig<RepoPinsCanvasProps> = {
  componentName: "RepoPinsCanvas",
  description:
    "A persistent pins board for tracking important GitHub items (issues, pull requests, files, discussions) with a status and notes. Tambo can add, edit, or remove pins and update their status. Set state.isOpen to show/hide this panel.",
  propsSchema: repoPinsCanvasPropsSchema,
  stateSchema: repoPinsCanvasStateSchema,
};

export const RepoPinsCanvas = withInteractable(RepoPinsCanvasBase, repoPinsCanvasConfig);
