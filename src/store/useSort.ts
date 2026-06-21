import { useState, useCallback, useEffect } from 'react';

export interface SortState {
  fieldId: string;
  order: 'asc' | 'desc';
}

// Simple global state for sorting
let globalSort: SortState | null = null;
const listeners = new Set<(sort: SortState | null) => void>();

export function useSort() {
  const [sort, setSort] = useState<SortState | null>(globalSort);

  const updateSort = useCallback((newSort: SortState | null) => {
    globalSort = newSort;
    setSort(newSort);
    listeners.forEach((listener) => listener(newSort));
  }, []);

  const clearSort = useCallback(() => {
    globalSort = null;
    setSort(null);
    listeners.forEach((listener) => listener(null));
  }, []);

  // Sync state across multiple components if needed
  useEffect(() => {
    const listener = (s: SortState | null) => setSort(s);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    sort,
    updateSort,
    clearSort,
  };
}
