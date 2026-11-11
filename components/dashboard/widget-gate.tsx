"use client";

import type { WidgetId } from "@/types/product";
import { usePreferences } from "@/lib/stores";

/** Hides a server-rendered widget when the user turned it off in "Customize dashboard". */
export function WidgetGate({ id, children }: { id: WidgetId; children: React.ReactNode }) {
  const { widgets } = usePreferences();
  if (!widgets[id]) return null;
  return <>{children}</>;
}

export function AllWidgetsHidden({ children }: { children: React.ReactNode }) {
  const { widgets } = usePreferences();
  return Object.values(widgets).some(Boolean) ? null : <>{children}</>;
}
