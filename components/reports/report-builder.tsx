"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import type { SavedReport } from "@/types/report";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Select } from "@/components/ui/select";
import { ReportChart, useReportSeries } from "@/components/reports/report-chart";
import { REPORT_METRICS, REPORT_RANGES } from "@/lib/report-meta";
import { reportSchema, type ReportFormValues } from "@/lib/validations";

const DEFAULTS: ReportFormValues = { name: "", description: "", category: "Revenue", metric: "revenue", chartType: "area", range: "90d", groupBy: "none" };

function toValues(r: SavedReport | null): ReportFormValues {
  return r ? { name: r.name, description: r.description, category: r.category, ...r.config } : DEFAULTS;
}

/** Create or edit a report. `report` null = create new. */
export function ReportBuilder({ open, onOpenChange, report, existingNames, onSave }: {
  open: boolean; onOpenChange: (o: boolean) => void; report: SavedReport | null; existingNames: string[]; onSave: (v: ReportFormValues, id?: string) => void;
}) {
  const { register, control, handleSubmit, reset, watch, setError, formState: { errors, isSubmitting } } = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: DEFAULTS,
  });
  useEffect(() => { if (open) reset(toValues(report)); }, [open, report, reset]);

  const metric = watch("metric"), chartType = watch("chartType"), range = watch("range"), groupBy = watch("groupBy");
  const { state, retry } = useReportSeries({ metric, chartType, range, groupBy });

  function onSubmit(v: ReportFormValues) {
    if (existingNames.includes(v.name.trim().toLowerCase())) {
      setError("name", { message: "A report with this name already exists." });
      return;
    }
    onSave({ ...v, name: v.name.trim() }, report?.id);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{report ? "Edit report" : "New report"}</DialogTitle>
          <DialogDescription className="text-[13px] text-muted">Choose a metric, chart and range. The preview uses your workspace data.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="grid gap-6 md:grid-cols-[18rem_1fr]">
            <div className="space-y-4">
              <Field label="Report name" htmlFor="rb-name" error={errors.name?.message}>
                <Input id="rb-name" aria-invalid={Boolean(errors.name)} aria-describedby="rb-name-msg" {...register("name")} />
              </Field>
              <Field label="Description" htmlFor="rb-desc" error={errors.description?.message}>
                <Textarea id="rb-desc" className="min-h-16" aria-invalid={Boolean(errors.description)} aria-describedby="rb-desc-msg" {...register("description")} />
              </Field>
              <Field label="Category" htmlFor="rb-cat">
                <Controller control={control} name="category" render={({ field }) => <Select id="rb-cat" value={field.value} onValueChange={field.onChange} options={["Revenue", "Customers", "Acquisition", "Subscriptions"].map((c) => ({ value: c, label: c }))} />} />
              </Field>
              <Field label="Metric" htmlFor="rb-metric">
                <Controller control={control} name="metric" render={({ field }) => <Select id="rb-metric" value={field.value} onValueChange={field.onChange} options={REPORT_METRICS.map((m) => ({ value: m.value, label: m.label }))} />} />
              </Field>
              <Field label="Chart type" htmlFor="rb-chart">
                <Controller control={control} name="chartType" render={({ field }) => <Select id="rb-chart" value={field.value} onValueChange={field.onChange} options={[{ value: "area", label: "Area" }, { value: "line", label: "Line" }, { value: "bar", label: "Bar" }]} />} />
              </Field>
              <Field label="Date range" htmlFor="rb-range">
                <Controller control={control} name="range" render={({ field }) => <Select id="rb-range" value={field.value} onValueChange={field.onChange} options={REPORT_RANGES.map((r) => ({ value: r.value, label: r.label }))} />} />
              </Field>
              <Field label="Group by" htmlFor="rb-group" hint="Splits the metric into one series per group.">
                <Controller control={control} name="groupBy" render={({ field }) => <Select id="rb-group" aria-describedby="rb-group-msg" value={field.value} onValueChange={field.onChange} options={[{ value: "none", label: "No grouping" }, { value: "plan", label: "Plan" }, { value: "billing", label: "Billing interval" }, { value: "channel", label: "Acquisition channel" }]} />} />
              </Field>
            </div>
            <div className="min-w-0">
              <p className="mb-3 text-sm font-semibold">Preview</p>
              <ReportChart config={{ metric, chartType, range, groupBy }} state={state} retry={retry} height={260} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>{isSubmitting && <Loader2 className="animate-spin" />}{report ? "Save changes" : "Save report"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
