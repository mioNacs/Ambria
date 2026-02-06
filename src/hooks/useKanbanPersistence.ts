"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type BoardType = "contributor" | "maintainer";

interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  badge?: string;
  url?: string;
}

interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
}

interface UseKanbanPersistenceResult {
  columns: KanbanColumn[];
  setColumns: (updater: KanbanColumn[] | ((prev: KanbanColumn[]) => KanbanColumn[])) => void;
  isLoading: boolean;
  isSaving: boolean;
}

/**
 * Hook for persisting kanban board state to Supabase.
 * Stores data in the workspaces table using contributor_canvas and maintainer_canvas columns.
 * Gracefully falls back to initialColumns if database columns don't exist.
 */
export function useKanbanPersistence(
  workspaceId: string | undefined,
  boardType: BoardType,
  initialColumns: KanbanColumn[]
): UseKanbanPersistenceResult {
  const supabase = useMemo(() => {
    if (typeof window === "undefined") return null;
    return createClient();
  }, []);

  // Start with initialColumns, not empty array
  const [columns, setColumnsInternal] = useState<KanbanColumn[]>(initialColumns);
  const [isLoading, setIsLoading] = useState(!!workspaceId);
  const [isSaving, setIsSaving] = useState(false);
  const [persistenceAvailable, setPersistenceAvailable] = useState(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const columnsRef = useRef(columns);

  // Keep ref in sync
  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  // Column name in the workspaces table
  const columnName = boardType === "contributor" ? "contributor_canvas" : "maintainer_canvas";

  // Load from database on mount
  useEffect(() => {
    if (!supabase || !workspaceId) {
      setIsLoading(false);
      return;
    }

    async function loadState() {
      try {
        const { data, error } = await supabase
          .from("workspaces")
          .select(columnName)
          .eq("id", workspaceId)
          .single();

        if (error) {
          // Column might not exist yet - use initial columns
          console.warn("Kanban persistence not available:", error.message);
          setPersistenceAvailable(false);
          // Keep initialColumns - don't clear them
        } else if (data?.[columnName] && Array.isArray(data[columnName]) && data[columnName].length > 0) {
          // Only use database data if it's a non-empty array
          setColumnsInternal(data[columnName] as KanbanColumn[]);
        }
        // If data[columnName] is null/empty, keep initialColumns
      } catch (err) {
        console.warn("Kanban persistence error:", err);
        setPersistenceAvailable(false);
      } finally {
        setIsLoading(false);
      }
    }

    loadState();
  }, [supabase, workspaceId, columnName, initialColumns]);

  // Debounced save to database
  const saveToDatabase = useCallback(
    async (newColumns: KanbanColumn[]) => {
      if (!supabase || !workspaceId || !persistenceAvailable) return;

      setIsSaving(true);
      try {
        const { error } = await supabase
          .from("workspaces")
          .update({ [columnName]: newColumns })
          .eq("id", workspaceId);

        if (error) {
          console.warn("Failed to save kanban state:", error.message);
          // Don't mark as unavailable - might be a transient error
        }
      } finally {
        setIsSaving(false);
      }
    },
    [supabase, workspaceId, columnName, persistenceAvailable]
  );

  // Set columns with debounced persistence
  const setColumns = useCallback(
    (updater: KanbanColumn[] | ((prev: KanbanColumn[]) => KanbanColumn[])) => {
      const next = typeof updater === "function" ? updater(columnsRef.current) : updater;
      columnsRef.current = next;
      setColumnsInternal(next);

      // Debounce save (500ms)
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveToDatabase(next);
      }, 500);
    },
    [saveToDatabase]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    columns,
    setColumns,
    isLoading,
    isSaving,
  };
}
