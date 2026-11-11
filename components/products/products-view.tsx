"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ProductPlan, PlanStatus } from "@/types/product";
import type { PlanStats, ProductsData } from "@/lib/repositories/products";
import { percentChange } from "@/lib/calculations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogDescription, DialogTitle, SheetContent } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { ResponsiveContainer, AXIS_PROPS, ChartTooltipCard, DataTableDisclosure, GRID_COLOR, Legend, SERIES } from "@/components/charts/chart-utils";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { ActiveFilters } from "@/components/shared/active-filters";
import { PlanFormDialog } from "@/components/products/plan-form-dialog";
import { useFormatters } from "@/hooks/use-formatters";
import { formatDate } from "@/lib/formatters";
import { PLAN_TIERS } from "@/lib/mock-data/constants";
import { deletedPlansStore, plansStore, useDeletedPlans, usePlanOverrides } from "@/lib/stores";
import { annualPriceLabel } from "@/components/products/plan-utils";

const EMPTY_STATS: PlanStats = { subscribers: 0, mrr: 0, previousMrr: 0, trend: [], byChannel: [] };
const statsFor = (data: ProductsData, p: ProductPlan): PlanStats => (p.custom ? EMPTY_STATS : data.stats[`${p.tier}:${p.interval}`] ?? EMPTY_STATS);

export function ProductsView({ data }: { data: ProductsData }) {
  const f = useFormatters();
  const overrides = usePlanOverrides();
  const deleted = useDeletedPlans();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | PlanStatus>("all");
  const [interval, setInterval_] = useState<"all" | "monthly" | "annual">("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductPlan | null>(null);
  const [toDelete, setToDelete] = useState<ProductPlan | null>(null);

  const plans = useMemo(() => {
    const byId = new Map(overrides.map((p) => [p.id, p]));
    const seeds = data.seedPlans.filter((p) => !deleted.includes(p.id)).map((p) => byId.get(p.id) ?? p);
    const custom = overrides.filter((p) => p.custom);
    return [...seeds, ...custom];
  }, [data.seedPlans, overrides, deleted]);

  const visible = plans.filter((p) =>
    (status === "all" || p.status === status) && (interval === "all" || p.interval === interval)
    && (!q.trim() || `${p.name} ${p.tier} ${p.description}`.toLowerCase().includes(q.trim().toLowerCase())));

  const totals = plans.reduce((a, p) => {
    const s = statsFor(data, p);
    return { subs: a.subs + s.subscribers, mrr: a.mrr + s.mrr, prev: a.prev + s.previousMrr };
  }, { subs: 0, mrr: 0, prev: 0 });
  const activePlans = plans.filter((p) => p.status === "active").length;
  const detail = plans.find((p) => p.id === selected) ?? null;

  const columns: Column<ProductPlan>[] = [
    { id: "name", header: "Plan", sortValue: (p) => p.name, cell: (p) => <span className="font-medium">{p.name}{p.custom && <span className="ml-2 text-xs font-normal text-muted">(custom)</span>}</span> },
    { id: "interval", header: "Billing", sortValue: (p) => p.interval, cell: (p) => (p.interval === "annual" ? "Annual" : "Monthly") },
    { id: "price", header: "Price", align: "right", sortValue: (p) => p.price, cell: (p) => <span className="tabular">{f.currency(p.price, p.price % 1 !== 0)}<span className="text-muted"> / {p.interval === "annual" ? "yr" : "mo"}</span></span> },
    { id: "subscribers", header: "Subscribers", align: "right", sortValue: (p) => statsFor(data, p).subscribers, cell: (p) => <span className="tabular">{f.number(statsFor(data, p).subscribers)}</span> },
    { id: "mrr", header: "MRR", align: "right", sortValue: (p) => statsFor(data, p).mrr, cell: (p) => <span className="font-medium tabular">{f.currency(statsFor(data, p).mrr)}</span> },
    { id: "status", header: "Status", sortValue: (p) => p.status, cell: (p) => <StatusBadge status={p.status} /> },
  ];

  function savePlan(plan: ProductPlan) {
    const ok = plansStore.set((prev) => [...prev.filter((p) => p.id !== plan.id), plan]);
    if (ok) toast.success(editing ? "Plan updated" : "Plan created");
    else toast.warning("Saved for this session only. Browser storage is unavailable.");
  }

  function confirmDelete() {
    if (!toDelete) return;
    const p = toDelete;
    if (p.custom) plansStore.set((prev) => prev.filter((x) => x.id !== p.id));
    else {
      deletedPlansStore.set((prev) => [...prev, p.id]);
      plansStore.set((prev) => prev.filter((x) => x.id !== p.id));
    }
    setToDelete(null);
    setSelected(null);
    toast.success(`Deleted ${p.name}`);
  }

  function restoreSamples() {
    deletedPlansStore.reset();
    plansStore.reset();
    toast.success("Default plans restored");
  }

  const chips = [
    ...(q ? [{ key: "q", label: `Search: ${q}`, onRemove: () => setQ("") }] : []),
    ...(status !== "all" ? [{ key: "s", label: `Status: ${status}`, onRemove: () => setStatus("all") }] : []),
    ...(interval !== "all" ? [{ key: "i", label: `Billing: ${interval}`, onRemove: () => setInterval_("all") }] : []),
  ];

  return (
    <div className="space-y-6">

      <section aria-label="Product metrics" className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active plans" description="Plans with status Active." value={activePlans} format="number" change={null} polarity="up-good" showChange={false} />
        <MetricCard label="Active subscriptions" description="Paying subscriptions across all listed plans." value={totals.subs} format="number" change={null} polarity="up-good" showChange={false} />
        <MetricCard label="Total plan MRR" description="Monthly recurring revenue across all listed plans." value={totals.mrr} format="currency" change={percentChange(totals.mrr, totals.prev)} polarity="up-good" />
        <MetricCard label="Avg MRR per plan" description="Total plan MRR ÷ number of plans with subscribers." value={totals.mrr / Math.max(1, plans.filter((p) => statsFor(data, p).subscribers > 0).length)} format="currency" change={null} polarity="up-good" showChange={false} />
      </section>

      <Card>
        <CardHeader>
          <div><CardTitle>Revenue by product</CardTitle><CardDescription>Month-end MRR by plan tier, last 12 months</CardDescription></div>
        </CardHeader>
        <CardContent>
          <div className="mb-3"><Legend items={PLAN_TIERS.map((t, i) => ({ label: t, color: SERIES[i] }))} /></div>
          <div role="img" aria-label="Stacked area chart of month-end MRR by plan tier over the last 12 months" className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 700, height: 260 }}>
              <AreaChart data={data.tierTrend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeDasharray="3 3" />
                <XAxis dataKey="month" {...AXIS_PROPS} />
                <YAxis {...AXIS_PROPS} width={56} tickFormatter={(v: number) => f.axisCurrency(v)} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload as Record<string, number | string>;
                  return <ChartTooltipCard title={String(row.month)} rows={PLAN_TIERS.map((t, i) => ({ name: t, value: f.currency(Number(row[t]), true), color: SERIES[i] }))} />;
                }} />
                {PLAN_TIERS.map((t, i) => <Area key={t} type="monotone" stackId="1" dataKey={t} stroke={SERIES[i]} strokeWidth={1.5} fill={SERIES[i]} fillOpacity={0.18} isAnimationActive={false} />)}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <DataTableDisclosure caption="MRR by plan tier" headers={["Month", ...PLAN_TIERS]} rows={data.tierTrend.map((r) => [String(r.month), ...PLAN_TIERS.map((t) => f.currency(Number(r[t])))])} />
        </CardContent>
      </Card>

      <Card>
        <div className="space-y-3 p-5">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <SearchInput className="lg:w-72" label="Search plans" placeholder="Search plans" value={q} onSearch={setQ} />
            <Select aria-label="Filter by status" className="lg:w-40" value={status} onValueChange={(v) => setStatus(v as typeof status)} options={[{ value: "all", label: "All statuses" }, { value: "active", label: "Active" }, { value: "draft", label: "Draft" }, { value: "archived", label: "Archived" }]} />
            <Select aria-label="Filter by billing interval" className="lg:w-44" value={interval} onValueChange={(v) => setInterval_(v as typeof interval)} options={[{ value: "all", label: "All intervals" }, { value: "monthly", label: "Monthly" }, { value: "annual", label: "Annual" }]} />
            <div className="flex gap-2 lg:ml-auto">
              <Button onClick={restoreSamples}>Restore default plans</Button>
              <Button variant="primary" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus /> Add plan</Button>
            </div>
          </div>
          <ActiveFilters chips={chips} onClear={() => { setQ(""); setStatus("all"); setInterval_("all"); }} />
        </div>
        <DataTable
          caption="Subscription plans"
          data={visible}
          columns={columns}
          getRowId={(p) => p.id}
          onRowClick={(p) => setSelected(p.id)}
          rowLabel={(p) => p.name}
          empty={<EmptyState icon={Package} title="No plans match" description="Try a different search or clear the filters." />}
        />
      </Card>

      <Dialog open={Boolean(detail)} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <SheetContent aria-describedby="plan-desc" className="max-w-lg">
          <DialogTitle className="sr-only">Plan details</DialogTitle>
          <DialogDescription id="plan-desc" className="sr-only">Pricing, subscribers, revenue trend and recent changes</DialogDescription>
          {detail && <PlanDetail plan={detail} stats={statsFor(data, detail)} onEdit={() => { setEditing(detail); setFormOpen(true); }} onDelete={() => setToDelete(detail)} />}
        </SheetContent>
      </Dialog>

      <PlanFormDialog open={formOpen} onOpenChange={setFormOpen} plan={editing} existingNames={plans.filter((p) => p.id !== editing?.id).map((p) => p.name.toLowerCase())} onSave={savePlan} />
      <ConfirmDialog open={Boolean(toDelete)} onOpenChange={(o) => { if (!o) setToDelete(null); }} title={`Delete ${toDelete?.name ?? "plan"}?`} description="This removes the plan from your workspace. You can restore the default plans at any time." onConfirm={confirmDelete} />
    </div>
  );
}

function PlanDetail({ plan, stats, onEdit, onDelete }: { plan: ProductPlan; stats: PlanStats; onEdit: () => void; onDelete: () => void }) {
  const f = useFormatters();
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="border-b p-5 pr-12">
        <h2 className="text-lg font-semibold">{plan.name}</h2>
        <div className="mt-1 flex items-center gap-2"><StatusBadge status={plan.status} /><span className="text-[13px] text-muted">Created {formatDate(plan.createdAt)}</span></div>
        <p className="mt-3 text-[13px] text-muted">{plan.description}</p>
        <div className="mt-4 flex gap-2">
          <Button size="sm" onClick={onEdit}><Pencil /> Edit</Button>
          <Button size="sm" variant="danger" onClick={onDelete}><Trash2 /> Delete</Button>
        </div>
      </div>
      <div className="space-y-6 p-5">
        <dl className="grid grid-cols-2 gap-3">
          {[
            ["Price", `${f.currency(plan.price, plan.price % 1 !== 0)} / ${plan.interval === "annual" ? "year" : "month"}`],
            ["Effective monthly", plan.interval === "annual" ? annualPriceLabel(plan.price, f.currency) : f.currency(plan.price, plan.price % 1 !== 0)],
            ["Subscribers", f.number(stats.subscribers)],
            ["MRR", f.currency(stats.mrr)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-md border p-3"><dt className="text-xs text-muted">{k}</dt><dd className="mt-0.5 font-semibold tabular">{v}</dd></div>
          ))}
        </dl>
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Revenue trend (12 months)</h3>
          {stats.trend.length === 0 ? <p className="text-[13px] text-muted">No subscribers yet, so there is no revenue history.</p> : (
            <div role="img" aria-label={`MRR trend for ${plan.name}: ${stats.trend.map((t) => `${t.month} ${f.currency(t.mrr)}`).join(", ")}`} className="h-36">
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 144 }}>
                <AreaChart data={stats.trend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <XAxis dataKey="month" {...AXIS_PROPS} interval={2} />
                  <Tooltip content={({ active, payload }) => active && payload?.length ? <ChartTooltipCard title={String(payload[0].payload.month)} rows={[{ name: "MRR", value: f.currency(Number(payload[0].payload.mrr), true), color: SERIES[0] }, { name: "Subscribers", value: f.number(Number(payload[0].payload.subscribers)) }]} /> : null} />
                  <Area type="monotone" dataKey="mrr" stroke={SERIES[0]} strokeWidth={2} fill={SERIES[0]} fillOpacity={0.12} dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Customers by acquisition channel</h3>
          {stats.byChannel.length === 0 ? <p className="text-[13px] text-muted">No active customers on this plan.</p> : (
            <div role="img" aria-label={`Customers by channel: ${stats.byChannel.map((c) => `${c.channel} ${c.customers}`).join(", ")}`} className="h-44">
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 176 }}>
                <BarChart data={stats.byChannel} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="channel" {...AXIS_PROPS} width={100} />
                  <Tooltip cursor={{ fill: "rgb(var(--surface-muted) / 0.6)" }} content={({ active, payload }) => active && payload?.length ? <ChartTooltipCard title={String(payload[0].payload.channel)} rows={[{ name: "Customers", value: f.number(Number(payload[0].payload.customers)), color: SERIES[0] }]} /> : null} />
                  <Bar dataKey="customers" fill={SERIES[0]} radius={[0, 4, 4, 0]} maxBarSize={16} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Recent changes</h3>
          {plan.changes.length === 0 ? <p className="text-[13px] text-muted">No changes recorded.</p> : (
            <ul className="space-y-2">{plan.changes.map((c, i) => <li key={i} className="flex gap-3 text-sm"><span className="w-24 shrink-0 text-muted">{formatDate(c.date, "MMM d, yyyy")}</span><span>{c.note}</span></li>)}</ul>
          )}
        </section>
      </div>
    </div>
  );
}
