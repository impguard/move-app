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
export type HiddenFilterState = 'active' | 'hidden' | 'all';

// Simple global state for filters
let globalFilters: ActiveFilters = {};
let globalSearchQuery: string = '';
let globalHiddenFilter: HiddenFilterState = 'active';
const listeners = new Set<(filters: ActiveFilters, search: string, hidden: HiddenFilterState) => void>();

export function useFilters() {
  const [filters, setFilters] = useState<ActiveFilters>(globalFilters);
  const [searchQuery, setSearchQueryState] = useState<string>(globalSearchQuery);
  const [hiddenFilter, setHiddenFilterState] = useState<HiddenFilterState>(globalHiddenFilter);

  const updateFilters = useCallback((newFilters: ActiveFilters) => {
    globalFilters = newFilters;
    setFilters(newFilters);
    listeners.forEach((listener) => listener(newFilters, globalSearchQuery, globalHiddenFilter));
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    globalSearchQuery = query;
    setSearchQueryState(query);
    listeners.forEach((listener) => listener(globalFilters, query, globalHiddenFilter));
  }, []);

  const setHiddenFilter = useCallback((hidden: HiddenFilterState) => {
    globalHiddenFilter = hidden;
    setHiddenFilterState(hidden);
    listeners.forEach((listener) => listener(globalFilters, globalSearchQuery, hidden));
  }, []);

  const clearFilters = useCallback(() => {
    globalFilters = {};
    setFilters({});
    listeners.forEach((listener) => listener({}, globalSearchQuery, globalHiddenFilter));
  }, []);

  // Sync state across multiple components if needed
  useEffect(() => {
    const listener = (f: ActiveFilters, q: string, h: HiddenFilterState) => {
      setFilters(f);
      setSearchQueryState(q);
      setHiddenFilterState(h);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  // Expose a way to hard-initialize from URL without triggering listeners if needed
  const _initFromUrl = useCallback((initFilters: ActiveFilters, initSearch: string, initHidden: HiddenFilterState) => {
    globalFilters = initFilters;
    globalSearchQuery = initSearch;
    globalHiddenFilter = initHidden;
    setFilters(initFilters);
    setSearchQueryState(initSearch);
    setHiddenFilterState(initHidden);
  }, []);

  return {
    filters,
    searchQuery,
    hiddenFilter,
    updateFilters,
    setSearchQuery,
    setHiddenFilter,
    clearFilters,
    _initFromUrl,
  };
}
