import { useState, useCallback, useEffect } from 'react';

export interface FieldFilter {
  min?: number;
  max?: number;
  bool?: boolean | null; // null means 'Any'
  tags?: string[];
  labels?: string[];
  bedsMin?: number;
  bedsMax?: number;
  bathsMin?: number;
  bathsMax?: number;
}

export type ActiveFilters = Record<string, FieldFilter>;

// Simple global state for filters
let globalFilters: ActiveFilters = {};
let globalSearchQuery: string = '';
let globalHideTaken: boolean = false;
const listeners = new Set<(filters: ActiveFilters, search: string, hideTaken: boolean) => void>();

export function useFilters() {
  const [filters, setFilters] = useState<ActiveFilters>(globalFilters);
  const [searchQuery, setSearchQueryState] = useState<string>(globalSearchQuery);
  const [hideTaken, setHideTakenState] = useState<boolean>(globalHideTaken);

  const updateFilters = useCallback((newFilters: ActiveFilters) => {
    globalFilters = newFilters;
    setFilters(newFilters);
    listeners.forEach((listener) => listener(newFilters, globalSearchQuery, globalHideTaken));
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    globalSearchQuery = query;
    setSearchQueryState(query);
    listeners.forEach((listener) => listener(globalFilters, query, globalHideTaken));
  }, []);

  const setHideTaken = useCallback((hide: boolean) => {
    globalHideTaken = hide;
    setHideTakenState(hide);
    listeners.forEach((listener) => listener(globalFilters, globalSearchQuery, hide));
  }, []);

  const clearFilters = useCallback(() => {
    globalFilters = {};
    setFilters({});
    listeners.forEach((listener) => listener({}, globalSearchQuery, globalHideTaken));
  }, []);

  // Sync state across multiple components if needed
  useEffect(() => {
    const listener = (f: ActiveFilters, q: string, ht: boolean) => {
      setFilters(f);
      setSearchQueryState(q);
      setHideTakenState(ht);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  // Expose a way to hard-initialize from URL without triggering listeners if needed
  const _initFromUrl = useCallback((initFilters: ActiveFilters, initSearch: string, initHideTaken: boolean) => {
    globalFilters = initFilters;
    globalSearchQuery = initSearch;
    globalHideTaken = initHideTaken;
    setFilters(initFilters);
    setSearchQueryState(initSearch);
    setHideTakenState(initHideTaken);
  }, []);

  return {
    filters,
    searchQuery,
    hideTaken,
    updateFilters,
    setSearchQuery,
    setHideTaken,
    clearFilters,
    _initFromUrl,
  };
}
