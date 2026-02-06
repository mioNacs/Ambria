"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface UseWorkspaceJsonArrayPersistenceResult<Item> {
  items: Item[];
  setItems: (updater: Item[] | ((prev: Item[]) => Item[])) => void;
  isLoading: boolean;
  isSaving: boolean;
}

function isSchemaError(error: { code?: string | null }) {
  // Postgres / PostgREST codes we most commonly see for missing tables/columns.
  return error.code === "42P01" || error.code === "42703";
}

/**
* Persist a JSON array column on the `workspaces` table.
*
* This intentionally degrades gracefully when the column does not exist yet
* (e.g., before running the provided `ALTER TABLE` statement).
*/
export function useWorkspaceJsonArrayPersistence<Item>(
  workspaceId: string | undefined,
  columnName: string,
  initialItems: Item[],
  options?: { debounceMs?: number },
): UseWorkspaceJsonArrayPersistenceResult<Item> {
  const debounceMs = options?.debounceMs ?? 500;

  const supabase = useMemo(() => {
    if (typeof window === "undefined") return null;
    return createClient();
  }, []);

  const [items, setItemsInternal] = useState<Item[]>(initialItems);
  const [isLoading, setIsLoading] = useState(!!workspaceId);
  const [isSaving, setIsSaving] = useState(false);
  const [persistenceAvailable, setPersistenceAvailable] = useState(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

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
          console.warn(
            `${columnName} persistence error:`,
            error.code ? `[${error.code}]` : "",
            error.message,
          );
          if (isSchemaError(error)) {
            setPersistenceAvailable(false);
          }
        } else if (Array.isArray(data?.[columnName])) {
          setItemsInternal(data[columnName] as Item[]);
        }
      } catch (err) {
        console.warn(`${columnName} persistence error:`, err);
      } finally {
        setIsLoading(false);
      }
    }

    loadState();
  }, [supabase, workspaceId, columnName]);

  const saveToDatabase = useCallback(
    async (nextItems: Item[]) => {
      if (!supabase || !workspaceId || !persistenceAvailable) return;

      setIsSaving(true);
      try {
        const { error } = await supabase
          .from("workspaces")
          .update({ [columnName]: nextItems })
          .eq("id", workspaceId);

        if (error) {
          console.warn(
            `Failed to save ${columnName} state:`,
            error.code ? `[${error.code}]` : "",
            error.message,
          );
          if (isSchemaError(error)) {
            setPersistenceAvailable(false);
          }
        }
      } finally {
        setIsSaving(false);
      }
    },
    [supabase, workspaceId, columnName, persistenceAvailable],
  );

  const setItems = useCallback(
    (updater: Item[] | ((prev: Item[]) => Item[])) => {
      const next = typeof updater === "function" ? updater(itemsRef.current) : updater;
      itemsRef.current = next;
      setItemsInternal(next);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        void saveToDatabase(next);
      }, debounceMs);
    },
    [debounceMs, saveToDatabase],
  );

  useEffect(() => {
    return () => {
      if (!saveTimeoutRef.current) return;
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;

      // Best-effort flush to reduce the chances of silently dropping the last update.
      if (!persistenceAvailable) return;
      void saveToDatabase(itemsRef.current);
    };
  }, [persistenceAvailable, saveToDatabase]);

  return {
    items,
    setItems,
    isLoading,
    isSaving,
  };
}
