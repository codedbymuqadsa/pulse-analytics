"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, FileQuestion, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, Skeleton } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ExportButton } from "@/components/shared/export-button";
import { PageHeader } from "@/components/shared/page-header";
import { ReportBuilder } from "@/components/reports/report-builder";
import { ReportChart, useReportSeries } from "@/components/reports/report-chart";
import { deleteReport, duplicateReport, RenameDialog, saveReport } from "@/components/reports/report-actions";
import { useMounted } from "@/hooks/use-mounted";
import { downloadCsv } from "@/lib/csv";
import { formatDate } from "@/lib/formatters";
import { metricMeta, REPORT_RANGES } from "@/lib/report-meta";
import { useReports } from "@/lib/stores";
import type { SavedReport } from "@/types/report";

export function ReportDetail({ id }: { id: string }) {
  const mounted = useMounted();
  const reports = useReports();
  const report = reports.find((r) => r.id === id);

  if (!mounted) return <div role="status" aria-label="Loading report" className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-80 w-full" /></div>;
  if (!report) {
    return (
      <Card>
        <EmptyState icon={FileQuestion} title="Report not found" description="This report may have been deleted, or it was saved in a different browser. Reports are stored locally in this browser only."
          action={<Button asChild variant="primary" size="sm"><Link href="/dashboard/reports">Back to reports</Link></Button>} />
      </Card>
    );
  }
  return <Loaded report={report} names={reports.map((r) => r.name.toLowerCase())} />;
}

function Loaded({ report, names }: { report: SavedReport; names: string[] }) {
  const router = useRouter();
  const { state, retry } = useReportSeries(report.config);
  const [editing, setEditing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const meta = metricMeta(report.config.metric);
  const range = REPORT_RANGES.find((r) => r.value === report.config.range)?.label;

  function exportCsv() {
    if (state.status !== "ready") return false;
    const { keys, rows } = state.series;
    return downloadCsv(`${report.name.replace(/[^\w]+/g, "-").toLowerCase()}.csv`, ["Date", ...keys.map((k) => `${meta.label}${keys.length > 1 ? ` – ${k}` : ""}${meta.currency ? " (USD)" : ""}`)], rows.map((r) => [String(r.date), ...keys.map((k) => r[k])]));
  }

  return (
    <>
      <PageHeader
        title={report.name}
        description={report.description || undefined}
        actions={
          <>
            <Button onClick={() => setRenaming(true)}><Pencil /> Rename</Button>
            <Button onClick={() => { const id = duplicateReport(report, names); router.push(`/dashboard/reports/${id}`); }}><Copy /> Duplicate</Button>
            <Button onClick={() => setEditing(true)}>Edit configuration</Button>
            <ExportButton onExport={exportCsv} />
            <Button variant="danger" onClick={() => setDeleting(true)}><Trash2 /> Delete</Button>
          </>
        }
      />
      <Card>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-2 text-[13px] text-muted">
            <Badge tone="primary">{report.category}</Badge>
            <span>{meta.label}</span>·<span>{range}</span>·<span className="capitalize">{report.config.chartType} chart</span>
            {report.config.groupBy !== "none" && <><span>·</span><span>Grouped by {report.config.groupBy}</span></>}
            <span className="ml-auto">Updated {formatDate(report.updatedAt)} · {report.owner}</span>
          </div>
          <ReportChart config={report.config} state={state} retry={retry} height={340} />
        </CardContent>
      </Card>
      <ReportBuilder open={editing} onOpenChange={setEditing} report={report} existingNames={names.filter((n) => n !== report.name.toLowerCase())} onSave={(v, rid) => { saveReport(v, rid); }} />
      <RenameDialog report={renaming ? report : null} existingNames={names.filter((n) => n !== report.name.toLowerCase())} onClose={() => setRenaming(false)} />
      <ConfirmDialog open={deleting} onOpenChange={setDeleting} title={`Delete “${report.name}”?`} description="This report configuration will be removed from this browser." onConfirm={() => { deleteReport(report.id); router.push("/dashboard/reports"); }} />
    </>
  );
}
