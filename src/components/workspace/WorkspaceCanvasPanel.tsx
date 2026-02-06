"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkspaceRole } from "@/lib/tambo";
import {
  ContributorPlanningCanvas,
  MaintainerTriageCanvas,
} from "@/components/tambo/workspace-kanban-canvas";

export interface WorkspaceCanvasPanelProps {
  role: WorkspaceRole;
}

type CanvasTab = "contributor" | "maintainer";

export function WorkspaceCanvasPanel({ role }: WorkspaceCanvasPanelProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
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

  return (
    <div
      className={cn(
        "flex flex-col bg-white/80 backdrop-blur border-l border-gray-200",
        isCollapsed ? "w-14" : "w-120",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between border-b border-gray-200",
          isCollapsed ? "px-2 py-2" : "pl-4 pr-2 py-2",
        )}
      >
        {isCollapsed ? (
          <div className="flex flex-col items-center w-full">
            <button
              onClick={() => setIsCollapsed(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Expand canvas"
            >
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </button>

            <div className="mt-2 p-2 rounded-lg bg-gray-100 text-gray-600">
              <LayoutDashboard className="w-5 h-5" />
            </div>
          </div>
        ) : (
          <>
            <div className="min-w-0">
              <div className="font-medium text-gray-800 text-sm truncate">
                Role-aware interactables
              </div>
            </div>
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Collapse canvas"
            >
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
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
          <div className="px-4 py-2 border-b border-gray-200">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTab("contributor")}
                className={cn(
                  "flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
                  visibleTab === "contributor"
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50",
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
                    ? "bg-purple-50 border-purple-200 text-purple-700"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50",
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
              title="Contributor planning"
              instructions="Use this board to track issues you want to work on. Ask the assistant to add issue links and break work into steps."
            />
          ) : null}

          {role === "maintainer" ? (
            <MaintainerTriageCanvas
              title="Maintainer triage"
              instructions="Use this board to organize incoming issues/PR work. Ask the assistant for a triage list, then drag items through the columns."
            />
          ) : null}

          {role === "both" ? (
            <>
              <div className={cn(visibleTab === "contributor" ? "block" : "hidden")}>
                <ContributorPlanningCanvas
                  title="Contributor planning"
                  instructions="Use this board to track issues you want to work on. Ask the assistant to add issue links and break work into steps."
                />
              </div>

              <div className={cn(visibleTab === "maintainer" ? "block" : "hidden")}>
                <MaintainerTriageCanvas
                  title="Maintainer triage"
                  instructions="Use this board to organize incoming issues/PR work. Ask the assistant for a triage list, then drag items through the columns."
                />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
