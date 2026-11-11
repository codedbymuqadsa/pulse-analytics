"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import type { ProductPlan } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Select } from "@/components/ui/select";
import { DEMO_END } from "@/lib/date-range";
import { PLAN_TIERS } from "@/lib/mock-data/constants";
import { planSchema, type PlanFormValues } from "@/lib/validations";

const DEFAULTS: PlanFormValues = { name: "", tier: "Starter", interval: "monthly", price: 29, status: "draft", description: "" };

export function PlanFormDialog({ open, onOpenChange, plan, existingNames, onSave }: {
  open: boolean; onOpenChange: (o: boolean) => void; plan: ProductPlan | null; existingNames: string[]; onSave: (p: ProductPlan) => void;
}) {
  const editing = Boolean(plan);
  const [dupe, setDupe] = useState<string | null>(null);
  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: DEFAULTS,
  });

  useEffect(() => {
    if (!open) return;
    setDupe(null);
    reset(plan ? { name: plan.name, tier: plan.tier, interval: plan.interval, price: plan.price, status: plan.status, description: plan.description } : DEFAULTS);
  }, [open, plan, reset]);

  function onSubmit(v: PlanFormValues) {
    if (existingNames.includes(v.name.trim().toLowerCase())) { setDupe("A plan with this name already exists."); return; }
    const today = format(new Date(DEMO_END + "T00:00:00"), "yyyy-MM-dd");
    const next: ProductPlan = plan
      ? { ...plan, name: v.name.trim(), description: v.description, status: v.status, changes: [{ date: today, note: "Plan metadata edited." }, ...plan.changes].slice(0, 6) }
      : { id: `custom-${Date.now().toString(36)}`, name: v.name.trim(), tier: v.tier, interval: v.interval, price: v.price, status: v.status, description: v.description, createdAt: today, changes: [{ date: today, note: "Plan created." }], custom: true };
    onSave(next);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{editing ? "Edit plan" : "Add plan"}</DialogTitle>
          <DialogDescription className="text-[13px] text-muted">{editing ? "Update metadata. Price, tier and interval are fixed after creation." : "Adds a new plan to your workspace."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="space-y-4">
            <Field label="Plan name" htmlFor="plan-name" error={errors.name?.message ?? dupe ?? undefined}>
              <Input id="plan-name" aria-invalid={Boolean(errors.name || dupe)} aria-describedby="plan-name-msg" {...register("name")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tier" htmlFor="plan-tier">
                <Controller control={control} name="tier" render={({ field }) => <Select id="plan-tier" disabled={editing} value={field.value} onValueChange={field.onChange} options={PLAN_TIERS.map((t) => ({ value: t, label: t }))} />} />
              </Field>
              <Field label="Billing interval" htmlFor="plan-interval">
                <Controller control={control} name="interval" render={({ field }) => <Select id="plan-interval" disabled={editing} value={field.value} onValueChange={field.onChange} options={[{ value: "monthly", label: "Monthly" }, { value: "annual", label: "Annual" }]} />} />
              </Field>
              <Field label="Price (USD)" htmlFor="plan-price" error={errors.price?.message}>
                <Input id="plan-price" type="number" step="0.01" min="0" disabled={editing} aria-invalid={Boolean(errors.price)} aria-describedby="plan-price-msg" {...register("price", { valueAsNumber: true })} />
              </Field>
              <Field label="Status" htmlFor="plan-status">
                <Controller control={control} name="status" render={({ field }) => <Select id="plan-status" value={field.value} onValueChange={field.onChange} options={[{ value: "active", label: "Active" }, { value: "draft", label: "Draft" }, { value: "archived", label: "Archived" }]} />} />
              </Field>
            </div>
            <Field label="Description" htmlFor="plan-desc" error={errors.description?.message}>
              <Textarea id="plan-desc" aria-invalid={Boolean(errors.description)} aria-describedby="plan-desc-msg" {...register("description")} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>{isSubmitting && <Loader2 className="animate-spin" />}{editing ? "Save changes" : "Create plan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
