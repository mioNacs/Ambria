"use client";

import * as React from "react";
import {
  AlertTriangle,
  Circle,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  LayoutDashboard,
  Loader2,
  Maximize2,
  Minimize2,
  Target,
} from "lucide-react";
import { useCurrentInteractablesSnapshot, useTamboInteractable } from "@tambo-ai/react";
import { cn } from "@/lib/utils";
import type { WorkspaceRole } from "@/lib/tambo";
import {
  ContributorPlanningCanvas,
  MaintainerTriageCanvas,
} from "@/components/tambo/workspace-kanban-canvas";
import { RepoFindingsCanvas } from "@/components/tambo/workspace-repo-findings-canvas";
import { RepoPinsCanvas } from "@/components/tambo/workspace-repo-pins-canvas";

export interface WorkspaceCanvasPanelProps {
  role: WorkspaceRole;
  workspaceId: string;
}

type WorkspaceTab = "contributor" | "maintainer";
type CanvasView = "list" | "workboards" | "repoPins" | "repoFindings";

type InteractableComponentName =
  | "ContributorPlanningCanvas"
  | "MaintainerTriageCanvas"
  | "RepoPinsCanvas"
  | "RepoFindingsCanvas";

const VIEW_LABELS: Record<Exclude<CanvasView, "list">, string> = {
  workboards: "Workboards",
  repoPins: "Repo pins",
  repoFindings: "Repo findings",
};

function viewForInteractable(componentName: InteractableComponentName): CanvasView {
  if (componentName === "RepoPinsCanvas") return "repoPins";
  if (componentName === "RepoFindingsCanvas") return "repoFindings";
  return "workboards";
}

export function WorkspaceCanvasPanel({ role, workspaceId }: WorkspaceCanvasPanelProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [view, setView] = React.useState<CanvasView>("list");
  const [preferredTab, setPreferredTab] = React.useState<WorkspaceTab>(() =>
    role === "maintainer" ? "maintainer" : "contributor",
  );
  const [pendingOpen, setPendingOpen] = React.useState<InteractableComponentName | null>(null);
  const suppressStateNavigationRef = React.useRef(false);
  // Reset suppression in a microtask so state-driven navigation doesn't immediately
  // override user-driven "Back to list". Token prevents stale resets.
  const suppressResetTokenRef = React.useRef(0);

  const pendingOpenRef = React.useRef<InteractableComponentName | null>(null);

  const interactables = useCurrentInteractablesSnapshot();
  const { setInteractableState, clearInteractableSelections, setInteractableSelected } =
    useTamboInteractable();

  const getInteractable = React.useCallback(
    (componentName: InteractableComponentName) => {
      // Walk from the end so the newest interactable wins (avoids stale duplicates in dev/StrictMode).
      for (let i = interactables.length - 1; i >= 0; i--) {
        const c = interactables[i];
        if (!c) continue;
        if (c.name !== componentName) continue;
        const candidateWorkspaceId = (c.props as { workspaceId?: string }).workspaceId;
        if (candidateWorkspaceId !== workspaceId) continue;
        return c;
      }

      return undefined;
    },
    [interactables, workspaceId],
  );

  const contributorIsOpen = getInteractable("ContributorPlanningCanvas")?.state?.isOpen === true;
  const maintainerIsOpen = getInteractable("MaintainerTriageCanvas")?.state?.isOpen === true;
  const pinsIsOpen = getInteractable("RepoPinsCanvas")?.state?.isOpen === true;
  const findingsIsOpen = getInteractable("RepoFindingsCanvas")?.state?.isOpen === true;

  const viewFromState: CanvasView = pinsIsOpen
    ? "repoPins"
    : findingsIsOpen
      ? "repoFindings"
      : contributorIsOpen || maintainerIsOpen
        ? "workboards"
        : "list";

  const lastViewFromStateRef = React.useRef<CanvasView>(viewFromState);

  React.useEffect(() => {
    if (suppressStateNavigationRef.current) return;
    if (viewFromState === view) return;

    // While we're intentionally opening a specific canvas, keep the local `view` stable.
    // If something else opens while we're pending, treat that as an override.
    if (pendingOpen) {
      const pendingTargetView = viewForInteractable(pendingOpen);

      if (viewFromState !== "list" && viewFromState !== pendingTargetView) {
        pendingOpenRef.current = null;
        setPendingOpen(null);
        setView(viewFromState);
      }
      return;
    }

    setView(viewFromState);
  }, [pendingOpen, setPendingOpen, setView, view, viewFromState]);

  React.useEffect(() => {
    const prevViewFromState = lastViewFromStateRef.current;
    lastViewFromStateRef.current = viewFromState;

    // If the panel is collapsed, auto-expand whenever we're explicitly opening a canvas
    // (`pendingOpen`) or when the active view changes away from `list` (AI/state-driven).
    if (!isCollapsed) return;
    if (pendingOpen) {
      setIsCollapsed(false);
      return;
    }

    if (prevViewFromState !== viewFromState && viewFromState !== "list") {
      setIsCollapsed(false);
    }
  }, [isCollapsed, pendingOpen, viewFromState]);

  React.useEffect(() => {
    if (role !== "both") return;
    if (maintainerIsOpen) {
      setPreferredTab("maintainer");
      return;
    }
    if (contributorIsOpen) {
      setPreferredTab("contributor");
    }
  }, [contributorIsOpen, maintainerIsOpen, role]);

  const visibleTab: WorkspaceTab = role === "maintainer"
    ? "maintainer"
    : role === "contributor"
      ? "contributor"
      : preferredTab;

  const activeWorkboard: InteractableComponentName =
    visibleTab === "maintainer" ? "MaintainerTriageCanvas" : "ContributorPlanningCanvas";

  const setIsOpen = React.useCallback(
    (componentName: InteractableComponentName, nextOpen: boolean) => {
      const interactable = getInteractable(componentName);
      if (!interactable) {
        if (nextOpen) {
          pendingOpenRef.current = componentName;
          setPendingOpen(componentName);
        }
        return;
      }

      const current = interactable.state?.isOpen;
      if (nextOpen) {
        if (current !== true) {
          setInteractableState(interactable.id, "isOpen", true);
        }
        return;
      }

      if (current === true) {
        setInteractableState(interactable.id, "isOpen", false);
      }
    },
    [getInteractable, setInteractableState],
  );

  React.useEffect(() => {
    const pending = pendingOpenRef.current;
    if (!pending) return;

    const interactable = getInteractable(pending);
    if (!interactable) return;

    pendingOpenRef.current = null;
    setPendingOpen(null);
    if (interactable.state?.isOpen !== true) {
      setInteractableState(interactable.id, "isOpen", true);
    }
  }, [getInteractable, setInteractableState]);

  const focusInteractable = React.useCallback(
    (componentName: InteractableComponentName) => {
      const interactable = getInteractable(componentName);
      if (!interactable) return;
      clearInteractableSelections();
      setInteractableSelected(interactable.id, true);
    },
    [clearInteractableSelections, getInteractable, setInteractableSelected],
  );

  React.useEffect(() => {
    const openTargets: Array<[InteractableComponentName, boolean]> = [
      ["ContributorPlanningCanvas", contributorIsOpen],
      ["MaintainerTriageCanvas", maintainerIsOpen],
      ["RepoPinsCanvas", pinsIsOpen],
      ["RepoFindingsCanvas", findingsIsOpen],
    ];

    const openNames = openTargets.filter(([, isOpen]) => isOpen).map(([name]) => name);
    if (openNames.length <= 1) return;

    // Prefer the canvas that `viewFromState` would navigate to (keeps the UI aligned
    // with state/AI-driven opens even if `view` hasn't synced yet).
    const keepByOpenState: InteractableComponentName | null = viewFromState === "repoPins"
      ? "RepoPinsCanvas"
      : viewFromState === "repoFindings"
        ? "RepoFindingsCanvas"
        : viewFromState === "workboards"
          ? maintainerIsOpen
            ? "MaintainerTriageCanvas"
            : contributorIsOpen
              ? "ContributorPlanningCanvas"
              : null
          : null;

    const keep = pendingOpen ?? keepByOpenState ?? openNames[0] ?? null;
    if (!keep) return;

    for (const [name, isOpen] of openTargets) {
      if (name === keep) continue;
      if (isOpen) setIsOpen(name, false);
    }
  }, [
    contributorIsOpen,
    findingsIsOpen,
    maintainerIsOpen,
    pendingOpen,
    pinsIsOpen,
    setIsOpen,
    viewFromState,
  ]);

  const closeAllCanvases = React.useCallback(() => {
    pendingOpenRef.current = null;
    setPendingOpen(null);
    setIsOpen("ContributorPlanningCanvas", false);
    setIsOpen("MaintainerTriageCanvas", false);
    setIsOpen("RepoPinsCanvas", false);
    setIsOpen("RepoFindingsCanvas", false);
  }, [setIsOpen]);

  const backToList = React.useCallback(() => {
    suppressStateNavigationRef.current = true;
    setView("list");
    closeAllCanvases();

    const token = ++suppressResetTokenRef.current;
    const reset = () => {
      if (suppressResetTokenRef.current !== token) return;
      suppressStateNavigationRef.current = false;
    };

    if (typeof queueMicrotask === "function") {
      queueMicrotask(reset);
    } else {
      setTimeout(reset, 0);
    }
  }, [closeAllCanvases]);

  const viewForComponent = React.useCallback((componentName: InteractableComponentName) => {
    return viewForInteractable(componentName);
  }, []);

  const openOnly = React.useCallback(
    (componentName: InteractableComponentName) => {
      if (componentName === "ContributorPlanningCanvas") {
        setPreferredTab("contributor");
      }
      if (componentName === "MaintainerTriageCanvas") {
        setPreferredTab("maintainer");
      }
      setView(viewForComponent(componentName));
      closeAllCanvases();
      pendingOpenRef.current = componentName;
      setPendingOpen(componentName);
      setIsOpen(componentName, true);
    },
    [closeAllCanvases, setIsOpen, viewForComponent],
  );

  const anyCanvasOpen = contributorIsOpen || maintainerIsOpen || pinsIsOpen || findingsIsOpen;

  React.useEffect(() => {
    if (!anyCanvasOpen) {
      suppressStateNavigationRef.current = false;
    }
  }, [anyCanvasOpen]);

  React.useEffect(() => {
    if (!isFullscreen || typeof window === "undefined") return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setIsFullscreen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen]);

  const headerTitle = view === "list" ? "Workboards" : VIEW_LABELS[view];
  const headerSubtitle = view === "list" ? "Click an item to open it" : "Back to list";

  return (
    <>
      <div
        className={cn(
          "flex flex-col bg-card backdrop-blur",
          "shadow-sm",
          isFullscreen
            ? "absolute inset-0 z-50 border border-muted-foreground/20"
            : "border-l border-muted-foreground/20",
          isFullscreen ? "w-full" : isCollapsed ? "w-14" : "w-[30rem]",
        )}
      >
      <div
        className={cn(
          "flex items-center justify-between border-b border-muted-foreground/20",
          isCollapsed ? "px-2 py-2" : "pl-4 pr-2 py-2",
        )}
      >
        {isCollapsed ? (
          <div className="flex flex-col items-center w-full">
            <button
              onClick={() => setIsCollapsed(false)}
              className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
              title="Expand canvas"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>

            <div className="mt-2 p-2 rounded-lg bg-muted/50 text-muted-foreground">
              <LayoutDashboard className="w-5 h-5" />
            </div>
          </div>
        ) : (
          <>
            <div className="min-w-0">
              <div className="font-medium text-foreground text-sm truncate">
                {headerTitle}
              </div>
              <div className="text-xs text-muted-foreground">
                {headerSubtitle}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setIsCollapsed(false);
                  setIsFullscreen((v) => !v);
                }}
                className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
                title={isFullscreen ? "Exit full screen" : "Full screen"}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Maximize2 className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsFullscreen(false);
                  setIsCollapsed(true);
                }}
                className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
                title="Collapse canvas"
              >
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </>
        )}
      </div>

      <div
        className={cn(
          "flex-1 min-h-0",
          isCollapsed ? "hidden" : "flex flex-col",
        )}
      >
        {view === "list" ? (
          <div className="p-4">
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                Interactables
              </div>

              <div
                className={cn(
                  "rounded-xl border border-muted-foreground/15 overflow-hidden",
                  "bg-gradient-to-b from-muted/10 to-transparent",
                )}
              >
                <div className="divide-y divide-muted-foreground/10">
                  <div className="flex items-center gap-2 p-2">
                    <button
                      type="button"
                      className={cn(
                        "flex-1 flex items-center gap-3 min-w-0",
                        "px-2 py-2 rounded-lg",
                        "hover:bg-muted/40 transition-colors text-left",
                      )}
                      onClick={() => {
                        openOnly(activeWorkboard);
                        focusInteractable(activeWorkboard);
                      }}
                      title="Open workboards"
                    >
                      <div
                        className={cn(
                          "p-2 rounded-lg shrink-0",
                          "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
                          "border border-indigo-500/15",
                        )}
                      >
                        <LayoutDashboard className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          Workboards
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          Planning + triage boards
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>

                    <button
                      type="button"
                      className={cn(
                        "p-2 rounded-lg border transition-colors",
                        "bg-transparent border-muted-foreground/20 text-muted-foreground",
                        "hover:bg-muted/30 hover:text-foreground",
                      )}
                      onClick={() => focusInteractable(activeWorkboard)}
                      title="Focus for assistant"
                    >
                      {(getInteractable(activeWorkboard)?.isSelected ?? false) ? (
                        <Target className="w-4 h-4 text-primary" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 p-2">
                    <button
                      type="button"
                      className={cn(
                        "flex-1 flex items-center gap-3 min-w-0",
                        "px-2 py-2 rounded-lg",
                        "hover:bg-muted/40 transition-colors text-left",
                      )}
                      onClick={() => {
                        openOnly("RepoPinsCanvas");
                        focusInteractable("RepoPinsCanvas");
                      }}
                      title="Open repo pins"
                    >
                      <div
                        className={cn(
                          "p-2 rounded-lg shrink-0",
                          "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                          "border border-blue-500/15",
                        )}
                      >
                        <Bookmark className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          Repo pins
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          Links + notes you want to track
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>

                    <button
                      type="button"
                      className={cn(
                        "p-2 rounded-lg border transition-colors",
                        "bg-transparent border-muted-foreground/20 text-muted-foreground",
                        "hover:bg-muted/30 hover:text-foreground",
                      )}
                      onClick={() => focusInteractable("RepoPinsCanvas")}
                      title="Focus for assistant"
                    >
                      {(getInteractable("RepoPinsCanvas")?.isSelected ?? false) ? (
                        <Target className="w-4 h-4 text-primary" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 p-2">
                    <button
                      type="button"
                      className={cn(
                        "flex-1 flex items-center gap-3 min-w-0",
                        "px-2 py-2 rounded-lg",
                        "hover:bg-muted/40 transition-colors text-left",
                      )}
                      onClick={() => {
                        openOnly("RepoFindingsCanvas");
                        focusInteractable("RepoFindingsCanvas");
                      }}
                      title="Open repo findings"
                    >
                      <div
                        className={cn(
                          "p-2 rounded-lg shrink-0",
                          "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                          "border border-amber-500/15",
                        )}
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          Repo findings
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          Severity + status + references
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>

                    <button
                      type="button"
                      className={cn(
                        "p-2 rounded-lg border transition-colors",
                        "bg-transparent border-muted-foreground/20 text-muted-foreground",
                        "hover:bg-muted/30 hover:text-foreground",
                      )}
                      onClick={() => focusInteractable("RepoFindingsCanvas")}
                      title="Focus for assistant"
                    >
                      {(getInteractable("RepoFindingsCanvas")?.isSelected ?? false) ? (
                        <Target className="w-4 h-4 text-primary" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="px-4 py-2 border-b border-muted-foreground/20 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={backToList}
                className="inline-flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground"
                title="Back"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="text-sm font-medium text-foreground">
                  {VIEW_LABELS[view]}
                </span>
              </button>

              <button
                type="button"
                className={cn(
                  "p-2 rounded-lg border transition-colors",
                  "bg-transparent border-muted-foreground/20 text-muted-foreground",
                  "hover:bg-muted/30 hover:text-foreground",
                )}
                onClick={() => {
                  if (view === "workboards") {
                    focusInteractable(activeWorkboard);
                    return;
                  }
                  if (view === "repoPins") {
                    focusInteractable("RepoPinsCanvas");
                    return;
                  }
                  focusInteractable("RepoFindingsCanvas");
                }}
                title="Focus for assistant"
              >
                <Target className="w-4 h-4" />
              </button>
            </div>

            {role === "both" && view === "workboards" ? (
              <div className="px-4 py-2 border-b border-muted-foreground/20">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPreferredTab("contributor");
                      openOnly("ContributorPlanningCanvas");
                    }}
                    className={cn(
                      "flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
                      visibleTab === "contributor"
                        ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"
                        : "bg-muted/30 border-muted-foreground/20 text-muted-foreground hover:bg-muted/50",
                    )}
                  >
                    Contributor
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPreferredTab("maintainer");
                      openOnly("MaintainerTriageCanvas");
                    }}
                    className={cn(
                      "flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
                      visibleTab === "maintainer"
                        ? "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400"
                        : "bg-muted/30 border-muted-foreground/20 text-muted-foreground hover:bg-muted/50",
                    )}
                  >
                    Maintainer
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}

        <div
          className={cn(
            "flex-1 min-h-0 overflow-y-auto",
            view === "list" ? "hidden" : "block",
          )}
        >
          <div className={cn(!anyCanvasOpen ? "block" : "hidden")}>
            <div className="h-full flex items-center justify-center p-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {pendingOpen ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                <span>
                  {pendingOpen ? "Opening canvas..." : "No canvas is currently open."}
                </span>
              </div>
            </div>
          </div>

          <div className={cn(view === "workboards" ? "block" : "hidden")}>
            {role !== "maintainer" ? (
              <div
                className={cn(
                  role === "both" && visibleTab !== "contributor" ? "hidden" : "block",
                )}
              >
                <ContributorPlanningCanvas
                  workspaceId={workspaceId}
                  title="Contributor planning"
                  instructions="Use this board to track issues you want to work on. Ask the assistant to add issue links and break work into steps."
                  defaultOpen={false}
                />
              </div>
            ) : null}

            {role !== "contributor" ? (
              <div
                className={cn(
                  role === "both" && visibleTab !== "maintainer" ? "hidden" : "block",
                )}
              >
                <MaintainerTriageCanvas
                  workspaceId={workspaceId}
                  title="Maintainer triage"
                  instructions="Use this board to organize incoming issues/PR work. Ask the assistant for a triage list, then drag items through the columns."
                  defaultOpen={false}
                />
              </div>
            ) : null}
          </div>

          <div className={cn(view === "repoPins" ? "block" : "hidden")}>
            <RepoPinsCanvas
              workspaceId={workspaceId}
              title="Repo pins"
              instructions="Pin issues, PRs, and files you want to track. Ask the assistant to keep this list up to date."
              defaultOpen={false}
            />
          </div>

          <div className={cn(view === "repoFindings" ? "block" : "hidden")}>
            <RepoFindingsCanvas
              workspaceId={workspaceId}
              title="Repo findings"
              instructions="Log analysis findings with severity, status, and references. Ask the assistant to capture findings as you explore the repo."
              defaultOpen={false}
            />
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
