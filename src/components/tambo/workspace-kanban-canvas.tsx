"use client";

import * as React from "react";
import { z } from "zod";
import {
  Cloud,
  CloudOff,
  ExternalLink,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { InteractableConfig, TamboThreadMessage } from "@tambo-ai/react";
import {
  TamboMessageProvider,
  useTamboComponentState,
  useTamboInteractable,
} from "@tambo-ai/react";
import { cn } from "@/lib/utils";
import { useKanbanPersistence, BoardType } from "@/hooks/useKanbanPersistence";

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
  workspaceId: z.string().optional(),
});

export const kanbanCanvasStateSchema = z.object({
  columns: kanbanColumnsSchema,
});

type KanbanCanvasProps = z.infer<typeof kanbanCanvasPropsSchema>;
type KanbanCard = z.infer<typeof kanbanCardSchema>;
type KanbanColumn = z.infer<typeof kanbanColumnSchema>;

const interactableKeyToId = new Map<string, string>();

function createStableInteractableComponent<ComponentProps extends object>(
  WrappedComponent: React.ComponentType<ComponentProps>,
  config: InteractableConfig<ComponentProps>,
  stableKeyFn: (props: ComponentProps) => string,
) {
  const displayName =
    WrappedComponent.displayName ?? WrappedComponent.name ?? "Component";

  const StableInteractableWrapper: React.FC<ComponentProps> = (props) => {
    const {
      addInteractableComponent,
      updateInteractableComponentProps,
      getInteractableComponent,
    } = useTamboInteractable();

    const { componentName, description, propsSchema, stateSchema } = config;

    const stableKey = stableKeyFn(props);
    const [interactableId, setInteractableId] = React.useState<string | null>(
      null,
    );
    const lastSerializedProps = React.useRef<Record<string, unknown>>({});
    const propsRef = React.useRef(props);

    React.useEffect(() => {
      propsRef.current = props;
    }, [props]);

    const [createdAt] = React.useState(() => new Date().toISOString());

    React.useEffect(() => {
      const cachedId = interactableKeyToId.get(stableKey);
      const cachedComponent = cachedId
        ? getInteractableComponent(cachedId)
        : undefined;

      if (cachedId && !cachedComponent) {
        interactableKeyToId.delete(stableKey);
      }

      if (cachedId && cachedComponent) {
        setInteractableId(cachedId);
        return () => {
          if (process.env.NODE_ENV !== "development") {
            interactableKeyToId.delete(stableKey);
          }
        };
      }

      const id = addInteractableComponent({
        name: componentName,
        description,
        component: WrappedComponent,
        props: propsRef.current as Record<string, unknown>,
        propsSchema,
        stateSchema,
      });

      interactableKeyToId.set(stableKey, id);
      lastSerializedProps.current = propsRef.current as Record<string, unknown>;
      setInteractableId(id);

      return () => {
        if (process.env.NODE_ENV !== "development") {
          interactableKeyToId.delete(stableKey);
        }
      };
    }, [
      addInteractableComponent,
      getInteractableComponent,
      componentName,
      description,
      propsSchema,
      stateSchema,
      stableKey,
    ]);

    const currentInteractable = interactableId
      ? getInteractableComponent(interactableId)
      : undefined;

    const effectiveProps =
      (currentInteractable?.props as ComponentProps | undefined) ?? props;

    React.useEffect(() => {
      if (!interactableId) return;

      const lastPropsString = JSON.stringify(lastSerializedProps.current);
      const currentPropsString = JSON.stringify(props);
      if (lastPropsString !== currentPropsString) {
        updateInteractableComponentProps(
          interactableId,
          props as Record<string, unknown>,
        );
        lastSerializedProps.current = props as Record<string, unknown>;
      }
    }, [interactableId, props, updateInteractableComponentProps]);

    if (!interactableId) {
      return null;
    }

    const interactableState =
      (currentInteractable?.state as Record<string, unknown> | undefined) ?? {};

    const minimalMessage: TamboThreadMessage = {
      id: interactableId,
      role: "assistant",
      content: [],
      threadId: "",
      createdAt,
      component: {
        componentName,
        componentState: interactableState,
        message: "",
        props: effectiveProps as Record<string, unknown>,
      },
      componentState: interactableState,
    };

    return (
      <TamboMessageProvider
        message={minimalMessage}
        interactableMetadata={{
          id: interactableId,
          componentName,
          description,
        }}
      >
        <WrappedComponent {...effectiveProps} />
      </TamboMessageProvider>
    );
  };

  StableInteractableWrapper.displayName =
    `StableInteractable(${config.componentName}:${displayName})`;
  return StableInteractableWrapper;
}

const KANBAN_DND_TYPE = "application/x-tambo-kanban-card";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

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
  const toCardsWithoutCard = toCol.cards.filter((c) => c.id !== card.id);
  if (toCardsWithoutCard.length >= 25) return columns;

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
        cards: [...toCardsWithoutCard, card],
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
      title: "Title (edit)",
      description: "",
    };

    return {
      ...col,
      cards: [...col.cards, newCard],
    };
  });
}

function removeCard(
  columns: KanbanColumn[],
  params: { columnId: string; cardId: string },
): KanbanColumn[] {
  return columns.map((col) => {
    if (col.id !== params.columnId) return col;
    return {
      ...col,
      cards: col.cards.filter((c) => c.id !== params.cardId),
    };
  });
}

function KanbanBoard({
  title,
  instructions,
  initialColumns,
  accentClass,
  workspaceId,
  boardType,
}: KanbanCanvasProps & { 
  initialColumns: KanbanColumn[]; 
  accentClass: string;
  boardType: BoardType;
}) {
  // Use persisted state if workspaceId is provided, otherwise fall back to Tambo state
  const persistedState = useKanbanPersistence(workspaceId, boardType, initialColumns);
  const [tamboColumns, setTamboColumns] = useTamboComponentState("columns", initialColumns);
  
  const usePersistence = !!workspaceId;
  
  // Track previous Tambo state to detect external updates (from AI)
  const prevTamboColumnsRef = React.useRef<string | null>(null);
  const hasSyncedFromDbRef = React.useRef(false);
  
  // One-time bootstrap: load Supabase state into Tambo on initial load.
  // Ongoing changes (UI/AI) flow Tambo -> Supabase.
  React.useEffect(() => {
    if (
      usePersistence &&
      !persistedState.isLoading &&
      !hasSyncedFromDbRef.current
    ) {
      setTamboColumns(persistedState.columns);
      prevTamboColumnsRef.current = JSON.stringify(persistedState.columns);
      hasSyncedFromDbRef.current = true;
    }
  }, [
    persistedState.columns,
    persistedState.isLoading,
    setTamboColumns,
    usePersistence,
  ]);
  
  // Sync Tambo -> Supabase when AI updates the state externally
  React.useEffect(() => {
    if (!usePersistence || !hasSyncedFromDbRef.current || !tamboColumns) return;
    
    const tamboJson = JSON.stringify(tamboColumns);
    const prevJson = prevTamboColumnsRef.current;
    
    // If Tambo state changed externally (not by us), sync to Supabase
    if (prevJson !== null && tamboJson !== prevJson) {
      persistedState.setColumns(tamboColumns);
    }
    
    prevTamboColumnsRef.current = tamboJson;
  }, [tamboColumns, usePersistence, persistedState]);
  
  // Use persisted columns for display when persistence is enabled
  const columns = usePersistence ? persistedState.columns : (tamboColumns ?? initialColumns);
  
  const setColumns = usePersistence 
    ? (updater: KanbanColumn[] | ((prev: KanbanColumn[]) => KanbanColumn[])) => {
        const next = typeof updater === "function" ? updater(persistedState.columns) : updater;
        persistedState.setColumns(next);
        // Also update Tambo state so AI sees the change immediately
        setTamboColumns(next);
        prevTamboColumnsRef.current = JSON.stringify(next);
      }
    : (updater: KanbanColumn[] | ((prev: KanbanColumn[]) => KanbanColumn[])) => {
        const next = typeof updater === "function" ? updater(tamboColumns ?? initialColumns) : updater;
        setTamboColumns(next);
      };
  
  const isLoading = usePersistence ? persistedState.isLoading : false;
  const isSaving = usePersistence ? persistedState.isSaving : false;

  const columnsRef = React.useRef(columns);
  React.useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  const applyColumnsUpdate = React.useCallback(
    (updater: (current: KanbanColumn[]) => KanbanColumn[]) => {
      const current = columnsRef.current;
      const input = process.env.NODE_ENV === "development"
        ? Object.freeze([...current])
        : current;
      const next = updater(input as KanbanColumn[]);
      if (next === input) return;
      setColumns(next);
    },
    [setColumns],
  );

  const [dragState, setDragState] = React.useState<
    { cardId: string; fromColumnId: string } | null
  >(null);
  
  // Modal state for expanded card view
  const [expandedCard, setExpandedCard] = React.useState<
    { card: KanbanCard; columnId: string } | null
  >(null);

  if (isLoading) {
    return (
      <section className="h-full bg-card flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading board...</span>
        </div>
      </section>
    );
  }

  // Helper to find current card data from expandedCard
  const getExpandedCardData = () => {
    if (!expandedCard) return null;
    const col = columns.find(c => c.id === expandedCard.columnId);
    if (!col) return null;
    return col.cards.find(c => c.id === expandedCard.card.id) ?? expandedCard.card;
  };

  const currentExpandedCard = getExpandedCardData();

  return (
    <>
      {/* Card Modal */}
      {expandedCard && currentExpandedCard && (
        <div 
          className="fixed inset-0 bg-black/10 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setExpandedCard(null)}
        >
          <div 
            className={cn(
              "bg-card border border-muted-foreground/20 rounded-xl shadow-2xl",
              "w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-muted-foreground/20 flex items-start justify-between gap-3">
              <input
                value={currentExpandedCard.title}
                onChange={(e) =>
                  applyColumnsUpdate((current) =>
                    updateCard(current, {
                      columnId: expandedCard.columnId,
                      cardId: expandedCard.card.id,
                      patch: { title: e.target.value },
                    }),
                  )
                }
                className="flex-1 bg-transparent text-base font-semibold text-foreground focus:outline-none"
                placeholder="Card title"
              />
              <div className="flex items-center gap-2 shrink-0">
                {currentExpandedCard.url && (
                  <a
                    href={currentExpandedCard.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                    title="Open link"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={() => setExpandedCard(null)}
                  className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
              {/* Badge */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Badge</label>
                  <input
                    value={currentExpandedCard.badge ?? ""}
                    onChange={(e) =>
                      applyColumnsUpdate((current) =>
                        updateCard(current, {
                          columnId: expandedCard.columnId,
                          cardId: expandedCard.card.id,
                          patch: { badge: e.target.value || undefined },
                        }),
                      )
                    }
                    placeholder="e.g. 'priority', 'bug', etc."
                    className={cn(
                      "px-2 py-1 rounded-md text-xs font-medium w-full",
                      "border border-muted-foreground/20 bg-muted/30 text-foreground",
                      "focus:outline-none focus:ring-2 focus:ring-primary/20"
                    )}
                  />
                </div>
              
              {/* URL */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Link URL</label>
                <input
                  value={currentExpandedCard.url ?? ""}
                  onChange={(e) =>
                    applyColumnsUpdate((current) =>
                      updateCard(current, {
                        columnId: expandedCard.columnId,
                        cardId: expandedCard.card.id,
                        patch: { url: e.target.value || undefined },
                      }),
                    )
                  }
                  placeholder="https://..."
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm w-full",
                    "border border-muted-foreground/20 bg-muted/30 text-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary/20",
                    "placeholder:text-muted-foreground/50"
                  )}
                />
              </div>
              
              {/* Description */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                <textarea
                  value={currentExpandedCard.description ?? ""}
                  onChange={(e) =>
                    applyColumnsUpdate((current) =>
                      updateCard(current, {
                        columnId: expandedCard.columnId,
                        cardId: expandedCard.card.id,
                        patch: { description: e.target.value },
                      }),
                    )
                  }
                  placeholder="Add details..."
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm w-full min-h-[200px] resize-y",
                    "border border-muted-foreground/20 bg-muted/30 text-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary/20",
                    "placeholder:text-muted-foreground/50"
                  )}
                />
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="px-4 py-3 border-t border-muted-foreground/20 flex justify-between">
              <button
                onClick={() => {
                  applyColumnsUpdate((current) =>
                    removeCard(current, {
                      columnId: expandedCard.columnId,
                      cardId: expandedCard.card.id,
                    }),
                  );
                  setExpandedCard(null);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium",
                  "text-destructive hover:bg-destructive/10 transition-colors"
                )}
              >
                Delete card
              </button>
              <button
                onClick={() => setExpandedCard(null)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-medium",
                  "bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                )}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      
      <section className="h-full bg-card overflow-hidden">
      <header className="px-4 py-3 border-b border-muted-foreground/20">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className={cn("h-2.5 w-2.5 rounded-full", accentClass)} />
              <h2 className="text-sm font-semibold text-foreground truncate">
                {title}
              </h2>
            </div>
            {instructions ? (
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {instructions}
              </p>
            ) : null}
          </div>
          
          {/* Sync status indicator */}
          {usePersistence ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {isSaving ? (
                <>
                  <Cloud className="w-3.5 h-3.5 animate-pulse" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600">Synced</span>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CloudOff className="w-3.5 h-3.5" />
              <span>Local only</span>
            </div>
          )}
        </div>
      </header>

      <div className="p-3 overflow-x-auto">
        <div className="flex gap-3 min-w-max">
          {columns.map((col) => {
            const isDropTarget = dragState && dragState.fromColumnId !== col.id;

            return (
              <div
                key={col.id}
                className={cn(
                  "w-72 shrink-0 rounded-xl border bg-muted/30",
                  "shadow-sm shadow-black/5 dark:shadow-black/20",
                  isDropTarget
                    ? "border-primary/50 ring-2 ring-primary/20"
                    : "border-muted-foreground/20"
                )}
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

                    applyColumnsUpdate((current) =>
                      reorderCards(current, {
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
                <div className="px-3 py-2.5 border-b border-muted-foreground/10 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">
                      {col.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {col.cards.length} card{col.cards.length === 1 ? "" : "s"}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      applyColumnsUpdate((current) => addCardToColumn(current, col.id))
                    }
                    className={cn(
                      "p-1.5 rounded-lg border border-muted-foreground/20",
                      "bg-background hover:bg-muted/50 text-muted-foreground hover:text-foreground",
                      "transition-colors"
                    )}
                    title="Add card"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-2 space-y-2 min-h-[100px]">
                  {col.cards.length === 0 ? (
                    <div className="text-xs text-muted-foreground/60 italic text-center py-4">
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
                      className={cn(
                        "rounded-lg border border-muted-foreground/20 bg-card",
                        "shadow-sm shadow-black/5 dark:shadow-black/20",
                        "hover:shadow-md hover:border-muted-foreground/30 transition-all cursor-grab active:cursor-grabbing",
                        "group"
                      )}
                    >
                      <div className="px-2.5 py-2 flex items-start gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground/40 mt-0.5 shrink-0" />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <span 
                              className="text-sm font-medium text-foreground truncate cursor-pointer hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedCard({ card, columnId: col.id });
                              }}
                              title="Click to expand"
                            >
                              {card.title}
                            </span>

                            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              {card.url && (
                                <a
                                  href={card.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                                  title="Open link"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  applyColumnsUpdate((current) =>
                                    removeCard(current, {
                                      columnId: col.id,
                                      cardId: card.id,
                                    }),
                                  );
                                }}
                                className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-destructive transition-colors"
                                title="Delete card"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {card.badge && (
                            <div className="mt-1">
                              <span className={cn(
                                "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium",
                                "border border-muted-foreground/20 bg-muted/60 text-muted-foreground"
                              )}>
                                {card.badge}
                              </span>
                            </div>
                          )}

                          {card.description && (
                            <p 
                              className="mt-1 text-xs text-muted-foreground line-clamp-2 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedCard({ card, columnId: col.id });
                              }}
                            >
                              {card.description}
                            </p>
                          )}
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
    </>
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
      boardType="contributor"
    />
  );
}

function MaintainerTriageCanvasBase(props: KanbanCanvasProps) {
  return (
    <KanbanBoard
      {...props}
      initialColumns={maintainerColumns}
      accentClass="bg-purple-500"
      boardType="maintainer"
    />
  );
}

const contributorCanvasConfig: InteractableConfig<KanbanCanvasProps> = {
  componentName: "ContributorPlanningCanvas",
  description:
    "A kanban-style planning canvas for contributors to track issues, work-in-progress, PR-ready items, and done tasks.",
  propsSchema: kanbanCanvasPropsSchema,
  stateSchema: kanbanCanvasStateSchema,
};

const maintainerCanvasConfig: InteractableConfig<KanbanCanvasProps> = {
  componentName: "MaintainerTriageCanvas",
  description:
    "A kanban-style triage canvas for maintainers to organize issues and PR work (needs triage, needs info, ready to act, closed).",
  propsSchema: kanbanCanvasPropsSchema,
  stateSchema: kanbanCanvasStateSchema,
};

export const ContributorPlanningCanvas = createStableInteractableComponent(
  ContributorPlanningCanvasBase,
  contributorCanvasConfig,
  (props) =>
    `${contributorCanvasConfig.componentName}:${props.workspaceId ?? "local"}`,
);

export const MaintainerTriageCanvas = createStableInteractableComponent(
  MaintainerTriageCanvasBase,
  maintainerCanvasConfig,
  (props) =>
    `${maintainerCanvasConfig.componentName}:${props.workspaceId ?? "local"}`,
);
