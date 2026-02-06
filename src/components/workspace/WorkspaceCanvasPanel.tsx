"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkspaceRole } from "@/lib/tambo";
import {
  ContributorPlanningCanvas,
  MaintainerTriageCanvas,
} from "@/components/tambo/workspace-kanban-canvas";

export interface WorkspaceCanvasPanelProps {
  role: WorkspaceRole;
  workspaceId: string;
}

type CanvasTab = "contributor" | "maintainer";

export function WorkspaceCanvasPanel({ role, workspaceId }: WorkspaceCanvasPanelProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [tab, setTab] = React.useState<CanvasTab>(() =>
    role === "maintainer" ? "maintainer" : "contributor",
  );

  const visibleTab: CanvasTab =
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
                Planning Board
              </div>
              <div className="text-xs text-muted-foreground">
                Drag cards to track progress
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
        {role === "both" ? (
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

        <div className="flex-1 min-h-0 overflow-y-auto">
          {role === "contributor" ? (
            <ContributorPlanningCanvas
              workspaceId={workspaceId}
              title="Contributor planning"
              instructions="Use this board to track issues you want to work on. Ask the assistant to add issue links and break work into steps."
            />
          ) : null}

          {role === "maintainer" ? (
            <MaintainerTriageCanvas
              workspaceId={workspaceId}
              title="Maintainer triage"
              instructions="Use this board to organize incoming issues/PR work. Ask the assistant for a triage list, then drag items through the columns."
            />
          ) : null}

          {role === "both" ? (
            <>
              <div className={cn(visibleTab === "contributor" ? "block" : "hidden")}>
                <ContributorPlanningCanvas
                  workspaceId={workspaceId}
                  title="Contributor planning"
                  instructions="Use this board to track issues you want to work on. Ask the assistant to add issue links and break work into steps."
                />
              </div>

              <div className={cn(visibleTab === "maintainer" ? "block" : "hidden")}>
                <MaintainerTriageCanvas
                  workspaceId={workspaceId}
                  title="Maintainer triage"
                  instructions="Use this board to organize incoming issues/PR work. Ask the assistant for a triage list, then drag items through the columns."
                />
              </div>
            </>
          ) : null}
        </div>
      </div>
      </div>
    </>
  );
}
