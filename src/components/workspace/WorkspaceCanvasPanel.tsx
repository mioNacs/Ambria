"use client";

import * as React from "react";
import {
  AlertTriangle,
  Circle,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  LayoutDashboard,
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

export function WorkspaceCanvasPanel({ role, workspaceId }: WorkspaceCanvasPanelProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [view, setView] = React.useState<CanvasView>("list");
  const [tab, setTab] = React.useState<WorkspaceTab>(() =>
    role === "maintainer" ? "maintainer" : "contributor",
  );
  const [pendingFocus, setPendingFocus] = React.useState<
    InteractableComponentName | null
  >(null);

  const interactables = useCurrentInteractablesSnapshot();
  const { setInteractableState, clearInteractableSelections, setInteractableSelected } =
    useTamboInteractable();

  const visibleTab: WorkspaceTab =
    role === "maintainer" ? "maintainer" : role === "contributor" ? "contributor" : tab;

  React.useEffect(() => {
    if (role === "contributor") {
      setTab("contributor");
      return;
    }
    if (role === "maintainer") {
      setTab("maintainer");
    }
  }, [role]);

  const getInteractable = React.useCallback(
    (componentName: InteractableComponentName) => {
      return interactables.find((c) => {
        if (c.name !== componentName) return false;
        return c.props.workspaceId === workspaceId;
      });
    },
    [interactables, workspaceId],
  );

  const setIsOpen = React.useCallback(
    (componentName: InteractableComponentName, nextOpen: boolean) => {
      const interactable = getInteractable(componentName);
      if (!interactable) return;

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

  const focusInteractable = React.useCallback(
    (componentName: InteractableComponentName) => {
      const interactable = getInteractable(componentName);
      if (!interactable) {
        setPendingFocus(componentName);
        return;
      }
      clearInteractableSelections();
      setInteractableSelected(interactable.id, true);
    },
    [clearInteractableSelections, getInteractable, setInteractableSelected],
  );

  React.useEffect(() => {
    if (!pendingFocus) return;
    const interactable = getInteractable(pendingFocus);
    if (!interactable) return;
    clearInteractableSelections();
    setInteractableSelected(interactable.id, true);
    setPendingFocus(null);
  }, [
    pendingFocus,
    clearInteractableSelections,
    getInteractable,
    setInteractableSelected,
  ]);

  React.useEffect(() => {
    const contributorOpen = view === "workboards" && visibleTab === "contributor";
    const maintainerOpen = view === "workboards" && visibleTab === "maintainer";
    const pinsOpen = view === "repoPins";
    const findingsOpen = view === "repoFindings";

    setIsOpen("ContributorPlanningCanvas", contributorOpen);
    setIsOpen("MaintainerTriageCanvas", maintainerOpen);
    setIsOpen("RepoPinsCanvas", pinsOpen);
    setIsOpen("RepoFindingsCanvas", findingsOpen);
  }, [setIsOpen, view, visibleTab]);

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
                Workboards
              </div>
              <div className="text-xs text-muted-foreground">
                Click an item to open it
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
                        setView("workboards");
                        focusInteractable(
                          visibleTab === "maintainer"
                            ? "MaintainerTriageCanvas"
                            : "ContributorPlanningCanvas",
                        );
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
                      onClick={() =>
                        focusInteractable(
                          visibleTab === "maintainer"
                            ? "MaintainerTriageCanvas"
                            : "ContributorPlanningCanvas",
                        )
                      }
                      title="Focus for assistant"
                    >
                      {(
                        getInteractable(
                          visibleTab === "maintainer"
                            ? "MaintainerTriageCanvas"
                            : "ContributorPlanningCanvas",
                        )?.isSelected ?? false
                      ) ? (
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
                        setView("repoPins");
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
                        setView("repoFindings");
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
                onClick={() => setView("list")}
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
                    focusInteractable(
                      visibleTab === "maintainer"
                        ? "MaintainerTriageCanvas"
                        : "ContributorPlanningCanvas",
                    );
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

            <div className="flex-1 min-h-0 overflow-y-auto">
              {role === "both" && view === "workboards" ? (
                <div className="px-4 py-2 border-b border-muted-foreground/20">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTab("contributor")}
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
                      onClick={() => setTab("maintainer")}
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

              <div className={cn(view === "workboards" ? "block" : "hidden")}>
                {role !== "maintainer" ? (
                  <div
                    className={cn(
                      role === "both" && visibleTab !== "contributor"
                        ? "hidden"
                        : "block",
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
                      role === "both" && visibleTab !== "maintainer"
                        ? "hidden"
                        : "block",
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
          </>
        )}
      </div>
      </div>
    </>
  );
}
