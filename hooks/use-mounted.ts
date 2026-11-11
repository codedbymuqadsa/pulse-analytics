"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** False during SSR / hydration, true afterwards. Use to avoid flashing server defaults for browser-only data. */
export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
