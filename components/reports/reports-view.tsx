"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BarChart3, Copy, FileBarChart, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import type { ReportCategory, SavedReport } from "@/types/report";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { Select } from "@/components/ui/select";
import { ActiveFilters } from "@/components/shared/active-filters";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { Skeleton } from "@/components/ui/card";
import { ReportBuilder } from "@/components/reports/report-builder";
import { deleteReport, duplicateReport, RenameDialog, saveReport } from "@/components/reports/report-actions";
import { useMounted } from "@/hooks/use-mounted";
import { useUrlState } from "@/hooks/use-url-state";
import { formatDate } from "@/lib/formatters";
import { metricMeta } from "@/lib/report-meta";
import { reportsStore, useReports } from "@/lib/stores";
import { SEED_REPORTS } from "@/lib/mock-data/reports";
import { toast } from "sonner";

const CATEGORIES: ReportCategory[] = ["Revenue", "Customers", "Acquisition", "Subscriptions"];
const SORTS = { updated: "Recently updated", name: "Name (A–Z)", category: "Category" } as const;
type SortKey = keyof typeof SORTS;

export function ReportCard({ report, onRename, onDuplicate, onDelete }: { report: SavedReport; onRename: () => void; onDuplicate: () => void; onDelete: () => void }) {
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="flex size-9 items-center justify-center rounded-md bg-primary-soft text-primary"><FileBarChart className="size-5" aria-hidden /></span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="-mr-2 -mt-1" aria-label={`Actions for ${report.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={onRename}><Pencil /> Rename</DropdownMenuItem>
            <DropdownMenuItem onSelect={onDuplicate}><Copy /> Duplicate</DropdownMenuItem>
            <DropdownMenuItem destructive onSelect={onDelete}><Trash2 /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <h3 className="mt-3 text-base font-semibold">{report.name}</h3>
      <p className="mt-1 line-clamp-2 flex-1 text-[13px] text-muted">{report.description || "No description."}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2"><Badge tone="primary">{report.category}</Badge><Badge>{metricMeta(report.config.metric).label}</Badge></div>
      <p className="mt-3 text-xs text-muted">Updated {formatDate(report.updatedAt)} · {report.owner}</p>
      <Button asChild className="mt-4 w-full"><Link href={`/dashboard/reports/${report.id}`}>Open report</Link></Button>
    </Card>
  );
}

export function ReportsView() {
  const mounted = useMounted();
  const reports = useReports();
  const params = useSearchParams();
  const { update } = useUrlState();
  const savedOnly = params.get("view") === "saved";
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<"all" | ReportCategory>("all");
  const [sort, setSort] = useState<SortKey>("updated");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [renaming, setRenaming] = useState<SavedReport | null>(null);
  const [deleting, setDeleting] = useState<SavedReport | null>(null);

  const names = useMemo(() => reports.map((r) => r.name.toLowerCase()), [reports]);
  const seedIds = useMemo(() => new Set(SEED_REPORTS.map((r) => r.id)), []);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = reports.filter((r) =>
      (!savedOnly || !seedIds.has(r.id)) && (category === "all" || r.category === category)
      && (!needle || `${r.name} ${r.description} ${r.owner} ${r.category}`.toLowerCase().includes(needle)));
    return [...filtered].sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "category" ? a.category.localeCompare(b.category) || a.name.localeCompare(b.name) : b.updatedAt.localeCompare(a.updatedAt));
  }, [reports, q, category, sort, savedOnly, seedIds]);

  const chips = [
    ...(q ? [{ key: "q", label: `Search: ${q}`, onRemove: () => setQ("") }] : []),
    ...(category !== "all" ? [{ key: "c", label: `Category: ${category}`, onRemove: () => setCategory("all") }] : []),
    ...(savedOnly ? [{ key: "v", label: "My saved reports", onRemove: () => update({ view: null }) }] : []),
  ];

  function restore() {
    reportsStore.reset();
    toast.success("Report library reset to defaults");
  }

  if (!mounted) return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" role="status" aria-label="Loading reports">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-56" />)}</div>;

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <SearchInput className="lg:w-72" label="Search reports" placeholder="Search reports" value={q} onSearch={setQ} />
          <Select aria-label="Filter by category" className="lg:w-44" value={category} onValueChange={(v) => setCategory(v as typeof category)} options={[{ value: "all", label: "All categories" }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]} />
          <Select aria-label="Sort reports" className="lg:w-48" value={sort} onValueChange={(v) => setSort(v as SortKey)} options={Object.entries(SORTS).map(([value, label]) => ({ value, label }))} />
          <div className="flex gap-2 lg:ml-auto">
            <Button onClick={restore}>Reset library</Button>
            <Button variant="primary" onClick={() => setBuilderOpen(true)}><Plus /> New report</Button>
          </div>
        </div>
        <ActiveFilters chips={chips} onClear={() => { setQ(""); setCategory("all"); update({ view: null }); }} />
      </div>

      {list.length === 0 ? (
        <Card>
          <EmptyState icon={BarChart3} title={reports.length === 0 ? "No reports yet" : savedOnly && chips.length === 1 ? "No saved reports yet" : "No reports match"}
            description={reports.length === 0 ? "Create a report to get started." : savedOnly && chips.length === 1 ? "Reports you create or duplicate show up here." : "Try a different search or category."}
            action={<Button variant="primary" size="sm" onClick={() => setBuilderOpen(true)}><Plus /> New report</Button>} />
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Reports">
          {list.map((r) => (
            <li key={r.id} className="flex"><div className="flex-1"><ReportCard report={r} onRename={() => setRenaming(r)} onDuplicate={() => duplicateReport(r, names)} onDelete={() => setDeleting(r)} /></div></li>
          ))}
        </ul>
      )}

      <ReportBuilder open={builderOpen} onOpenChange={setBuilderOpen} report={null} existingNames={names} onSave={(v) => { saveReport(v); }} />
      <RenameDialog report={renaming} existingNames={names.filter((n) => n !== renaming?.name.toLowerCase())} onClose={() => setRenaming(null)} />
      <ConfirmDialog open={Boolean(deleting)} onOpenChange={(o) => { if (!o) setDeleting(null); }} title={`Delete “${deleting?.name ?? ""}”?`} description="This report configuration will be permanently removed. You can reset the library to restore the default reports." onConfirm={() => { if (deleting) deleteReport(deleting.id); setDeleting(null); }} />
    </div>
  );
}
