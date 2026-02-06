"use client";

import * as React from "react";
import {
  Circle,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
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

type CanvasPanelDefinition = {
  componentName:
    | "ContributorPlanningCanvas"
    | "MaintainerTriageCanvas"
    | "RepoPinsCanvas"
    | "RepoFindingsCanvas";
  label: string;
  defaultOpen: boolean;
};

export function WorkspaceCanvasPanel({ role, workspaceId }: WorkspaceCanvasPanelProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const interactables = useCurrentInteractablesSnapshot();
  const { setInteractableState, clearInteractableSelections, setInteractableSelected } =
    useTamboInteractable();

  const panelDefinitions = React.useMemo<CanvasPanelDefinition[]>(() => {
    const defs: CanvasPanelDefinition[] = [];

    if (role !== "maintainer") {
      defs.push({
        componentName: "ContributorPlanningCanvas",
        label: "Contributor planning",
        defaultOpen: role === "contributor" || role === "both",
      });
    }

    if (role !== "contributor") {
      defs.push({
        componentName: "MaintainerTriageCanvas",
        label: "Maintainer triage",
        defaultOpen: role === "maintainer",
      });
    }

    defs.push({
      componentName: "RepoPinsCanvas",
      label: "Repo pins",
      defaultOpen: false,
    });

    defs.push({
      componentName: "RepoFindingsCanvas",
      label: "Repo findings",
      defaultOpen: false,
    });

    return defs;
  }, [role]);

  const panels = React.useMemo(() => {
    return panelDefinitions.map((def) => {
      const interactable = interactables.find((c) => {
        if (c.name !== def.componentName) return false;
        return c.props.workspaceId === workspaceId;
      });

      const isOpenFromState = interactable?.state?.isOpen;
      const isOpen =
        typeof isOpenFromState === "boolean" ? isOpenFromState : def.defaultOpen;
      const isSelected = interactable?.isSelected ?? false;

      return {
        ...def,
        interactableId: interactable?.id ?? null,
        isOpen,
        isSelected,
      };
    });
  }, [interactables, panelDefinitions, workspaceId]);

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
                Canvas
              </div>
              <div className="text-xs text-muted-foreground">
                Open panels to track work and findings
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
        <div className="px-4 py-3 border-b border-muted-foreground/20">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Panels
          </div>

          <div className="space-y-1">
            {panels.map((panel) => (
              <div
                key={panel.componentName}
                className={cn(
                  "flex items-center gap-2",
                  "px-2 py-2 rounded-lg border",
                  panel.isOpen
                    ? "bg-muted/20 border-muted-foreground/20"
                    : "bg-transparent border-muted-foreground/10",
                )}
              >
                <button
                  type="button"
                  className={cn(
                    "flex-1 flex items-center gap-2 min-w-0",
                    "text-left text-sm",
                    "hover:text-foreground transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    panel.isOpen ? "text-foreground" : "text-muted-foreground",
                  )}
                  disabled={!panel.interactableId}
                  onClick={() => {
                    if (!panel.interactableId) return;
                    setInteractableState(panel.interactableId, "isOpen", !panel.isOpen);
                  }}
                  title={panel.isOpen ? "Close panel" : "Open panel"}
                >
                  {panel.isOpen ? (
                    <Eye className="w-4 h-4 shrink-0" />
                  ) : (
                    <EyeOff className="w-4 h-4 shrink-0" />
                  )}
                  <span className="truncate">{panel.label}</span>
                </button>

                <button
                  type="button"
                  className={cn(
                    "p-1.5 rounded-lg border transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    panel.isSelected
                      ? "bg-primary/10 border-primary/20 text-primary"
                      : "bg-transparent border-muted-foreground/20 text-muted-foreground hover:bg-muted/30 hover:text-foreground",
                  )}
                  disabled={!panel.interactableId}
                  onClick={() => {
                    if (!panel.interactableId) return;
                    clearInteractableSelections();
                    setInteractableSelected(panel.interactableId, true);
                  }}
                  title="Focus for assistant"
                >
                  {panel.isSelected ? (
                    <Target className="w-4 h-4" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {role !== "maintainer" ? (
            <ContributorPlanningCanvas
              workspaceId={workspaceId}
              title="Contributor planning"
              instructions="Use this board to track issues you want to work on. Ask the assistant to add issue links and break work into steps."
              defaultOpen={role === "contributor" || role === "both"}
            />
          ) : null}

          {role !== "contributor" ? (
            <MaintainerTriageCanvas
              workspaceId={workspaceId}
              title="Maintainer triage"
              instructions="Use this board to organize incoming issues/PR work. Ask the assistant for a triage list, then drag items through the columns."
              defaultOpen={role === "maintainer"}
            />
          ) : null}

          <RepoPinsCanvas
            workspaceId={workspaceId}
            title="Repo pins"
            instructions="Pin issues, PRs, and files you want to track. Ask the assistant to keep this list up to date."
            defaultOpen={false}
          />

          <RepoFindingsCanvas
            workspaceId={workspaceId}
            title="Repo findings"
            instructions="Log analysis findings with severity, status, and references. Ask the assistant to capture findings as you explore the repo."
            defaultOpen={false}
          />
        </div>
      </div>
      </div>
    </>
  );
}
