"use client";

import { useSyncExternalStore } from "react";

export interface LocalStore<T> {
  get(): T;
  set(next: T | ((prev: T) => T)): boolean;
  reset(): void;
  subscribe(listener: () => void): () => void;
  getServerSnapshot(): T;
}

/**
 * Minimal localStorage-backed external store.
 * - Server and first client render use `initial` (no hydration mismatch).
 * - Malformed / unavailable storage falls back to `initial`.
 * - `set` returns false when persistence failed (e.g. quota / private mode); in-memory state still updates.
 */
export function createLocalStore<T>(key: string, initial: T, parse: (raw: unknown) => T | null): LocalStore<T> {
  let value = initial;
  let loaded = false;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  function load() {
    if (loaded || typeof window === "undefined") return;
    loaded = true;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = parse(JSON.parse(raw));
        if (parsed) value = parsed;
      }
    } catch {
      /* ignore malformed or unavailable storage */
    }
    window.addEventListener("storage", (e) => {
      if (e.key !== key) return;
      try {
        const parsed = e.newValue ? parse(JSON.parse(e.newValue)) : initial;
        value = parsed ?? initial;
        emit();
      } catch { /* ignore */ }
    });
  }

  return {
    get() { load(); return value; },
    getServerSnapshot: () => initial,
    set(next) {
      load();
      value = typeof next === "function" ? (next as (p: T) => T)(value) : next;
      let ok = true;
      try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { ok = false; }
      emit();
      return ok;
    },
    reset() {
      load();
      value = initial;
      try { window.localStorage.removeItem(key); } catch { /* ignore */ }
      emit();
    },
    subscribe(l) { listeners.add(l); return () => { listeners.delete(l); }; },
  };
}

export function useLocalStore<T>(store: LocalStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.getServerSnapshot);
}
