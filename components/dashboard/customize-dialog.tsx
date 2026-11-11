"use client";

import { useState } from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/controls";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DEFAULT_PREFERENCES, preferencesStore, usePreferences, WIDGETS } from "@/lib/stores";

export function CustomizeDialog() {
  const prefs = usePreferences();
  const [open, setOpen] = useState(false);

  function toggle(id: (typeof WIDGETS)[number]["id"], on: boolean) {
    const ok = preferencesStore.set((p) => ({ ...p, widgets: { ...p.widgets, [id]: on } }));
    if (!ok) toast.error("Could not save to this browser. The change applies until you reload.");
  }

  function restore() {
    preferencesStore.set((p) => ({ ...p, widgets: { ...DEFAULT_PREFERENCES.widgets } }));
    toast.success("Dashboard layout restored to defaults");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><SlidersHorizontal /> Customize</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Customize dashboard</DialogTitle>
          <DialogDescription className="text-[13px] text-muted">Choose which widgets appear on the overview. KPI cards are always shown. Saved in this browser only.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <ul className="divide-y">
            {WIDGETS.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <label htmlFor={`widget-${w.id}`} className="block cursor-pointer text-sm font-medium">{w.label}</label>
                  <p className="text-[13px] text-muted">{w.description}</p>
                </div>
                <Toggle id={`widget-${w.id}`} checked={prefs.widgets[w.id]} onCheckedChange={(v) => toggle(w.id, v)} />
              </li>
            ))}
          </ul>
        </DialogBody>
        <DialogFooter>
          <Button onClick={restore}><RotateCcw /> Restore defaults</Button>
          <Button variant="primary" onClick={() => setOpen(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
