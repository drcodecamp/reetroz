"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

export type Progress = { page: number; total: number; at: number };
export type ProgressMap = Record<string, Progress>;

const KEY = "pp:progress";
const SPEED_KEY = "pp:speed";
const DEFAULT_SPEED = 5;

// ---- tiny external store over localStorage -----------------------------------
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function read(key: string, fallback: string) {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

// ---- progress --------------------------------------------------------------
export function saveProgress(slug: string, page: number, total: number) {
  if (typeof window === "undefined") return;
  let all: ProgressMap = {};
  try {
    all = JSON.parse(read(KEY, "{}")) as ProgressMap;
  } catch {
    all = {};
  }
  all[slug] = { page, total, at: Date.now() };
  window.localStorage.setItem(KEY, JSON.stringify(all));
  emit();
}

export function useProgress(): ProgressMap {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(KEY, "{}"),
    () => "{}",
  );
  return useMemo(() => {
    try {
      return JSON.parse(raw) as ProgressMap;
    } catch {
      return {};
    }
  }, [raw]);
}

// ---- speed -----------------------------------------------------------------
export function useSpeed(): [number, (seconds: number) => void] {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(SPEED_KEY, ""),
    () => "",
  );
  const speed = useMemo(() => {
    const v = Number(raw);
    return Number.isFinite(v) && v > 0 ? v : DEFAULT_SPEED;
  }, [raw]);
  const setSpeed = useCallback((seconds: number) => {
    const clamped = Math.min(60, Math.max(1, Math.round(seconds * 10) / 10));
    window.localStorage.setItem(SPEED_KEY, String(clamped));
    emit();
  }, []);
  return [speed, setSpeed];
}

// ---- media query -----------------------------------------------------------
export function useMediaQuery(query: string, serverDefault = false): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => serverDefault,
  );
}
