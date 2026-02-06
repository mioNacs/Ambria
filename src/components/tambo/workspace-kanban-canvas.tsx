"use client";

import * as React from "react";
import { z } from "zod";
import { ExternalLink, GripVertical, Plus } from "lucide-react";
import { useTamboComponentState, withInteractable } from "@tambo-ai/react";

const kanbanCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  badge: z.string().optional(),
  url: z.string().url().optional(),
});

const kanbanColumnSchema = z.object({
  id: z.string(),
  title: z.string(),
  cards: z.array(kanbanCardSchema).max(25),
});

const kanbanColumnsSchema = z.array(kanbanColumnSchema).min(2).max(6);

export const kanbanCanvasPropsSchema = z.object({
  title: z.string(),
  instructions: z.string().optional(),
});

export const kanbanCanvasStateSchema = z.object({
  columns: kanbanColumnsSchema,
});

type KanbanCanvasProps = z.infer<typeof kanbanCanvasPropsSchema>;
type KanbanCard = z.infer<typeof kanbanCardSchema>;
type KanbanColumn = z.infer<typeof kanbanColumnSchema>;

const KANBAN_DND_TYPE = "application/x-tambo-kanban-card";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function createClientId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function reorderCards(
  columns: KanbanColumn[],
  params: {
    cardId: string;
    fromColumnId: string;
    toColumnId: string;
  },
): KanbanColumn[] {
  const fromCol = columns.find((c) => c.id === params.fromColumnId);
  const toCol = columns.find((c) => c.id === params.toColumnId);

  if (!fromCol || !toCol) return columns;
  if (fromCol.id === toCol.id) return columns;

  const card = fromCol.cards.find((c) => c.id === params.cardId);
  if (!card) return columns;
  if (toCol.cards.length >= 25) return columns;

  return columns.map((col) => {
    if (col.id === fromCol.id) {
      return {
        ...col,
        cards: col.cards.filter((c) => c.id !== card.id),
      };
    }
    if (col.id === toCol.id) {
      return {
        ...col,
        cards: [...col.cards, card],
      };
    }
    return col;
  });
}

function updateCard(
  columns: KanbanColumn[],
  params: { columnId: string; cardId: string; patch: Partial<KanbanCard> },
): KanbanColumn[] {
  return columns.map((col) => {
    if (col.id !== params.columnId) return col;
    return {
      ...col,
      cards: col.cards.map((c) =>
        c.id === params.cardId ? { ...c, ...params.patch } : c,
      ),
    };
  });
}

function addCardToColumn(columns: KanbanColumn[], columnId: string): KanbanColumn[] {
  return columns.map((col) => {
    if (col.id !== columnId) return col;
    if (col.cards.length >= 25) return col;

    const newCard: KanbanCard = {
      id: createClientId("card"),
      title: "New card",
      description: "",
    };

    return {
      ...col,
      cards: [...col.cards, newCard],
    };
  });
}

function KanbanBoard({
  title,
  instructions,
  initialColumns,
  accentClass,
}: KanbanCanvasProps & { initialColumns: KanbanColumn[]; accentClass: string }) {
  const [columns, setColumns] = useTamboComponentState(
    "columns",
    initialColumns,
    initialColumns,
  );
  const resolvedColumns = columns ?? initialColumns;

  const [dragState, setDragState] = React.useState<
    { cardId: string; fromColumnId: string } | null
  >(null);

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <header className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${accentClass}`} />
              <h2 className="text-sm font-semibold text-gray-900 truncate">
                {title}
              </h2>
            </div>
            {instructions ? (
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                {instructions}
              </p>
            ) : null}
          </div>

          <div className="text-xs text-gray-400">Drag cards between columns</div>
        </div>
      </header>

      <div className="p-4 overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {resolvedColumns.map((col) => {
            const isDropTarget = dragState && dragState.fromColumnId !== col.id;

            return (
              <div
                key={col.id}
                className={`w-72 flex-shrink-0 rounded-xl border bg-gray-50/80 ${
                  isDropTarget
                    ? "border-gray-300"
                    : "border-gray-200"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={(e) => {
                  e.preventDefault();

                  const raw = e.dataTransfer.getData(KANBAN_DND_TYPE);
                  if (!raw) return;

                  try {
                    const parsed: unknown = JSON.parse(raw);
                    if (!isPlainObject(parsed)) {
                      return;
                    }

                    const cardId = parsed.cardId;
                    const fromColumnId = parsed.fromColumnId;
                    if (typeof cardId !== "string" || typeof fromColumnId !== "string") {
                      return;
                    }

                    setColumns(
                      reorderCards(resolvedColumns, {
                        cardId,
                        fromColumnId,
                        toColumnId: col.id,
                      }),
                    );
                  } finally {
                    setDragState(null);
                  }
                }}
              >
                <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-gray-800 truncate">
                      {col.title}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {col.cards.length} card{col.cards.length === 1 ? "" : "s"}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setColumns(addCardToColumn(resolvedColumns, col.id))}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600"
                    title="Add card"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 space-y-2">
                  {col.cards.length === 0 ? (
                    <div className="text-xs text-gray-400 italic">
                      Drop cards here
                    </div>
                  ) : null}

                  {col.cards.map((card) => (
                    <article
                      key={card.id}
                      draggable
                      onDragStart={(e) => {
                        setDragState({ cardId: card.id, fromColumnId: col.id });
                        e.dataTransfer.setData(
                          KANBAN_DND_TYPE,
                          JSON.stringify({ cardId: card.id, fromColumnId: col.id }),
                        );
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => setDragState(null)}
                      className="rounded-lg border border-gray-200 bg-white shadow-sm"
                    >
                      <div className="px-2 py-2 flex items-start gap-2">
                        <GripVertical className="w-4 h-4 text-gray-300 mt-0.5" />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <input
                              aria-label={`${col.title}: card title`}
                              value={card.title}
                              onChange={(e) =>
                                setColumns(
                                  updateCard(resolvedColumns, {
                                    columnId: col.id,
                                    cardId: card.id,
                                    patch: { title: e.target.value },
                                  }),
                                )
                              }
                              className="w-full bg-transparent text-xs font-semibold text-gray-900 focus:outline-none"
                            />

                            {card.url ? (
                              <a
                                href={card.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-gray-600"
                                title="Open link"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            ) : null}
                          </div>

                          {card.badge ? (
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700">
                                {card.badge}
                              </span>
                            </div>
                          ) : null}

                          <textarea
                            aria-label={`${col.title}: card description`}
                            value={card.description ?? ""}
                            onChange={(e) =>
                              setColumns(
                                updateCard(resolvedColumns, {
                                  columnId: col.id,
                                  cardId: card.id,
                                  patch: { description: e.target.value },
                                }),
                              )
                            }
                            placeholder="Add details..."
                            className="mt-2 w-full resize-none bg-transparent text-xs text-gray-600 placeholder:text-gray-400 focus:outline-none"
                            rows={3}
                          />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const contributorColumns: KanbanColumn[] = [
  {
    id: "backlog",
    title: "Backlog",
    cards: [
      {
        id: "issue-1",
        title: "Pick 1-2 good first issues",
        description: "Ask the assistant to list issues tagged 'good first issue' and add links here.",
        badge: "starter",
      },
    ],
  },
  {
    id: "doing",
    title: "Working",
    cards: [],
  },
  {
    id: "pr",
    title: "PR ready",
    cards: [],
  },
  {
    id: "done",
    title: "Done",
    cards: [],
  },
];

const maintainerColumns: KanbanColumn[] = [
  {
    id: "needs-triage",
    title: "Needs triage",
    cards: [
      {
        id: "triage-1",
        title: "Review new/unlabeled issues",
        description: "Ask the assistant for the newest open issues and drag them through this board.",
        badge: "triage",
      },
    ],
  },
  {
    id: "needs-info",
    title: "Needs info",
    cards: [],
  },
  {
    id: "ready",
    title: "Ready to act",
    cards: [],
  },
  {
    id: "closed",
    title: "Closed/merged",
    cards: [],
  },
];

function ContributorPlanningCanvasBase(props: KanbanCanvasProps) {
  return (
    <KanbanBoard
      {...props}
      initialColumns={contributorColumns}
      accentClass="bg-blue-500"
    />
  );
}

function MaintainerTriageCanvasBase(props: KanbanCanvasProps) {
  return (
    <KanbanBoard
      {...props}
      initialColumns={maintainerColumns}
      accentClass="bg-purple-500"
    />
  );
}

export const ContributorPlanningCanvas = withInteractable(
  ContributorPlanningCanvasBase,
  {
    componentName: "ContributorPlanningCanvas",
    description:
      "A kanban-style planning canvas for contributors to track issues, work-in-progress, PR-ready items, and done tasks.",
    propsSchema: kanbanCanvasPropsSchema,
    stateSchema: kanbanCanvasStateSchema,
  },
);

export const MaintainerTriageCanvas = withInteractable(
  MaintainerTriageCanvasBase,
  {
    componentName: "MaintainerTriageCanvas",
    description:
      "A kanban-style triage canvas for maintainers to organize issues and PR work (needs triage, needs info, ready to act, closed).",
    propsSchema: kanbanCanvasPropsSchema,
    stateSchema: kanbanCanvasStateSchema,
  },
);
