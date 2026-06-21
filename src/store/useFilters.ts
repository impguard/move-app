import { useState, useCallback, useEffect } from 'react';

export interface FieldFilter {
  min?: number;
  max?: number;
  bool?: boolean | null; // null means 'Any'
  tags?: string[];
  labels?: string[];
}

export type ActiveFilters = Record<string, FieldFilter>;

// Simple global state for filters
let globalFilters: ActiveFilters = {};
const listeners = new Set<(filters: ActiveFilters) => void>();

export function useFilters() {
  const [filters, setFilters] = useState<ActiveFilters>(globalFilters);

  const updateFilters = useCallback((newFilters: ActiveFilters) => {
    globalFilters = newFilters;
    setFilters(newFilters);
    listeners.forEach((listener) => listener(newFilters));
  }, []);

  const clearFilters = useCallback(() => {
    globalFilters = {};
    setFilters({});
    listeners.forEach((listener) => listener({}));
  }, []);

  // Sync state across multiple components if needed
  useEffect(() => {
    const listener = (f: ActiveFilters) => setFilters(f);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    filters,
    updateFilters,
    clearFilters,
  };
}
