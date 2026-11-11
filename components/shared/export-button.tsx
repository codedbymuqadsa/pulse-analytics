"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Runs `onExport`, which resolves true when a file was produced and false when there was nothing to export.
 * Guards against double submission and reports real outcomes only.
 */
export function ExportButton({ onExport, label = "Export CSV", size = "md", variant = "secondary" }: {
  onExport: () => Promise<boolean> | boolean; label?: string; size?: "sm" | "md"; variant?: "secondary" | "ghost";
}) {
  const [busy, setBusy] = useState(false);
  async function run() {
    if (busy) return;
    setBusy(true);
    try {
      const ok = await onExport();
      if (ok) toast.success("Export downloaded");
      else toast.info("Nothing to export for the current filters.");
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button variant={variant} size={size} onClick={run} disabled={busy} aria-busy={busy}>
      {busy ? <Loader2 className="animate-spin" /> : <Download />}
      {label}
    </Button>
  );
}

/** Fetches a CSV endpoint and saves it. Resolves false when the server reports an empty dataset (422). */
export async function exportFromApi(url: string, filename: string): Promise<boolean> {
  const res = await fetch(url);
  if (res.status === 422) return false;
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
  return true;
}
