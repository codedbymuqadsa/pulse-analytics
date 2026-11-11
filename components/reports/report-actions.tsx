"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import type { SavedReport } from "@/types/report";
import type { ReportFormValues } from "@/lib/validations";
import { renameSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/form";
import { reportsStore } from "@/lib/stores";

const today = () => format(new Date(), "yyyy-MM-dd");
const persistToast = (ok: boolean, message: string) => (ok ? toast.success(message) : toast.warning(`${message} (this session only: browser storage is unavailable)`));

export function saveReport(v: ReportFormValues, id?: string): string {
  const { name, description, category, metric, chartType, range, groupBy } = v;
  const config = { metric, chartType, range, groupBy };
  if (id) {
    const ok = reportsStore.set((list) => list.map((r) => (r.id === id ? { ...r, name, description, category, config, updatedAt: today() } : r)));
    persistToast(ok, "Report updated");
    return id;
  }
  const newId = `rpt-${Date.now().toString(36)}`;
  const ok = reportsStore.set((list) => [{ id: newId, name, description, category, owner: "You", updatedAt: today(), config }, ...list]);
  persistToast(ok, "Report saved");
  return newId;
}

export function duplicateReport(r: SavedReport, names: string[]): string {
  let name = `${r.name} (copy)`;
  for (let n = 2; names.includes(name.toLowerCase()); n++) name = `${r.name} (copy ${n})`;
  const id = `rpt-${Date.now().toString(36)}`;
  const ok = reportsStore.set((list) => [{ ...r, id, name, owner: "You", updatedAt: today() }, ...list]);
  persistToast(ok, `Duplicated as “${name}”`);
  return id;
}

export function deleteReport(id: string) {
  const ok = reportsStore.set((list) => list.filter((r) => r.id !== id));
  persistToast(ok, "Report deleted");
}

export function RenameDialog({ report, existingNames, onClose }: { report: SavedReport | null; existingNames: string[]; onClose: () => void }) {
  return (
    <Dialog open={Boolean(report)} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">{report && <RenameForm key={report.id} report={report} existingNames={existingNames} onClose={onClose} />}</DialogContent>
    </Dialog>
  );
}

function RenameForm({ report, existingNames, onClose }: { report: SavedReport; existingNames: string[]; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, setError, formState: { errors } } = useForm<{ name: string }>({ resolver: zodResolver(renameSchema), defaultValues: { name: report.name } });
  function onSubmit({ name }: { name: string }) {
    if (busy) return;
    if (existingNames.includes(name.trim().toLowerCase())) { setError("name", { message: "A report with this name already exists." }); return; }
    setBusy(true);
    const ok = reportsStore.set((list) => list.map((r) => (r.id === report.id ? { ...r, name: name.trim(), updatedAt: today() } : r)));
    persistToast(ok, "Report renamed");
    onClose();
  }
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <DialogHeader>
        <DialogTitle className="text-base font-semibold">Rename report</DialogTitle>
        <DialogDescription className="text-[13px] text-muted">Give this report a new name.</DialogDescription>
      </DialogHeader>
      <DialogBody>
        <Field label="Report name" htmlFor="rename-name" error={errors.name?.message}>
          <Input id="rename-name" autoFocus aria-invalid={Boolean(errors.name)} aria-describedby="rename-name-msg" {...register("name")} />
        </Field>
      </DialogBody>
      <DialogFooter>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={busy}>Rename</Button>
      </DialogFooter>
    </form>
  );
}
