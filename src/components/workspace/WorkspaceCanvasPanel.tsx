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

  if (isCollapsed) {
    return (
      <div className="w-14 flex flex-col items-center py-2 bg-white/90 backdrop-blur border-l border-gray-200 shadow-sm">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Expand canvas"
        >
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </button>

        <div className="mt-3 p-2 rounded-lg bg-gray-100 text-gray-600">
          <LayoutDashboard className="w-5 h-5" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-120 flex flex-col bg-white/80 backdrop-blur border-l border-gray-200">
      <div className="flex items-center justify-between pl-4 pr-2 py-2 border-b border-gray-200">
        <div className="min-w-0">
          <div className="font-medium text-gray-800 text-sm truncate">Role-aware interactables</div>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Collapse canvas"
        >
          <ChevronRight className="w-5 h-5 text-gray-500" />
        </button>
      </div>

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
        {visibleTab === "contributor" ? (
          <ContributorPlanningCanvas
            title="Contributor planning"
            instructions="Use this board to track issues you want to work on. Ask the assistant to add issue links and break work into steps."
          />
        ) : (
          <MaintainerTriageCanvas
            title="Maintainer triage"
            instructions="Use this board to organize incoming issues/PR work. Ask the assistant for a triage list, then drag items through the columns."
          />
        )}
      </div>
    </div>
  );
}
