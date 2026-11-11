"use client";

import { ChevronDown, Download } from "lucide-react";
import { toast } from "sonner";
import type { ComparisonPoint, DashboardMetric } from "@/types/analytics";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { CompareToggle } from "@/components/shared/date-range-picker";
import { CustomizeDialog } from "@/components/dashboard/customize-dialog";
import { downloadCsv } from "@/lib/csv";

export function OverviewActions({ metrics, points, rangeLabel }: { metrics: DashboardMetric[]; points: ComparisonPoint[]; rangeLabel: string }) {
  function exportKpis() {
    const ok = downloadCsv("pulse-kpi-summary.csv", ["Metric", "Period", "Value", "Previous period value", "Change %"],
      metrics.map((m) => [m.label, rangeLabel, round(m.value), m.previousValue === null ? "" : round(m.previousValue), m.change === null ? "" : round(m.change)]));
    if (ok) toast.success("KPI summary downloaded"); else toast.info("Nothing to export.");
  }
  function exportRevenue() {
    const ok = downloadCsv("pulse-revenue-series.csv", ["Date", "Revenue (USD)", "Previous period date", "Previous period revenue (USD)"],
      points.map((p) => [p.date, p.value, p.previousDate ?? "", p.previous ?? ""]));
    if (ok) toast.success("Revenue series downloaded"); else toast.info("No revenue data in this range to export.");
  }
  return (
    <>
      <div className="mr-2 hidden sm:block"><CompareToggle id="compare-overview" /></div>
      <CustomizeDialog />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="primary"><Download /> Export report <ChevronDown /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={exportKpis}>KPI summary (CSV)</DropdownMenuItem>
          <DropdownMenuItem onSelect={exportRevenue}>Revenue series (CSV)</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

const round = (n: number) => Math.round(n * 100) / 100;
