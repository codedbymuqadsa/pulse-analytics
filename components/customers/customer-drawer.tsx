"use client";

import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, Tooltip, XAxis } from "recharts";
import { FileText, LifeBuoy, LogIn, Repeat, Upload } from "lucide-react";
import type { Customer, CustomerActivity } from "@/types/customer";
import type { CustomerDetail } from "@/lib/repositories/customers";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/card";
import { Dialog, DialogDescription, DialogTitle, SheetContent } from "@/components/ui/dialog";
import { ResponsiveContainer, AXIS_PROPS, ChartTooltipCard, SERIES } from "@/components/charts/chart-utils";
import { Avatar } from "@/components/shared/avatar";
import { ErrorState } from "@/components/shared/error-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { useFormatters } from "@/hooks/use-formatters";
import { formatDate } from "@/lib/formatters";
import { useCustomerLabels } from "@/lib/stores";

const ICONS: Record<CustomerActivity["type"], typeof LogIn> = { login: LogIn, invoice: FileText, plan_change: Repeat, support: LifeBuoy, export: Upload };

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; detail: CustomerDetail };

export function CustomerDrawer({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const id = customer?.id;

  const load = useCallback(async (cid: string, signal?: AbortSignal) => {
    setState({ status: "loading" });
    try {
      const res = await fetch(`/api/customers/${cid}`, { signal });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Request failed");
      setState({ status: "ready", detail: json.data });
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setState({ status: "error", message: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    const ac = new AbortController();
    load(id, ac.signal);
    return () => ac.abort();
  }, [id, load]);

  return (
    <Dialog open={Boolean(customer)} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent aria-describedby="customer-desc" className="max-w-lg">
        <DialogTitle className="sr-only">Customer details{customer ? `: ${customer.name}` : ""}</DialogTitle>
        <DialogDescription id="customer-desc" className="sr-only">Profile, subscription, revenue history and recent activity</DialogDescription>
        {customer && <DrawerBody customer={customer} state={state} retry={() => load(customer.id)} />}
      </SheetContent>
    </Dialog>
  );
}

function DrawerBody({ customer: c, state, retry }: { customer: Customer; state: State; retry: () => void }) {
  const f = useFormatters();
  const labels = useCustomerLabels()[c.id] ?? [];
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="border-b p-5 pr-12">
        <div className="flex items-center gap-3">
          <Avatar name={c.name} size="lg" />
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{c.name}</h2>
            <p className="truncate text-[13px] text-muted">{c.company}</p>
            <div className="mt-1.5 flex flex-wrap gap-1"><StatusBadge status={c.status} />{labels.map((l) => <Badge key={l} tone="primary">{l}</Badge>)}</div>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-5">
        <Section title="Contact">
          <Row k="Email" v={<span className="break-all">{c.email}</span>} />
          <Row k="Customer ID" v={c.id} />
          <Row k="Acquired via" v={`${c.channel} · ${c.campaign}`} />
        </Section>
        <Section title="Subscription">
          <Row k="Plan" v={c.plan} />
          <Row k="Billing" v={c.billing === "annual" ? "Annual" : "Monthly"} />
          <Row k="Monthly spend" v={c.mrr > 0 ? f.currency(c.mrr, true) : "—"} />
          <Row k="Customer since" v={formatDate(c.createdAt)} />
          <Row k="Last activity" v={formatDate(c.lastActivityAt)} />
          {c.canceledAt && <Row k="Canceled" v={formatDate(c.canceledAt)} />}
        </Section>

        {state.status === "loading" && <div className="space-y-3" role="status" aria-label="Loading customer details"><Skeleton className="h-32 w-full" /><Skeleton className="h-24 w-full" /></div>}
        {state.status === "error" && <ErrorState title="Couldn't load details" description={state.message} onRetry={retry} className="py-6" />}
        {state.status === "ready" && (
          <>
            <Section title={`Revenue history · ${f.currency(state.detail.lifetimeRevenue, true)} lifetime`}>
              <div role="img" aria-label={`Paid revenue by month: ${state.detail.revenueHistory.map((r) => `${r.month} ${f.currency(r.amount)}`).join(", ")}`} className="h-32">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 380, height: 128 }}>
                  <BarChart data={state.detail.revenueHistory} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                    <XAxis dataKey="month" {...AXIS_PROPS} tickFormatter={(m: string) => m.slice(0, 3)} />
                    <Tooltip cursor={{ fill: "rgb(var(--surface-muted) / 0.6)" }} content={({ active, payload }) => active && payload?.length ? <ChartTooltipCard title={String(payload[0].payload.month)} rows={[{ name: "Paid", value: f.currency(Number(payload[0].payload.amount), true), color: SERIES[0] }]} /> : null} />
                    <Bar dataKey="amount" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>
            <Section title="Recent transactions">
              {state.detail.transactions.length === 0 ? <p className="text-[13px] text-muted">No invoices yet.</p> : (
                <ul className="divide-y">
                  {state.detail.transactions.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                      <div><p className="font-mono text-[13px]">{t.id}</p><p className="text-xs text-muted">{formatDate(t.date)} · {t.plan}</p></div>
                      <div className="flex items-center gap-3"><span className="font-medium tabular">{f.currency(t.amount, true)}</span><StatusBadge status={t.status} /></div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
            <Section title="Recent activity">
              <ul className="space-y-3">
                {state.detail.activity.map((a) => {
                  const Icon = ICONS[a.type];
                  return (
                    <li key={a.id} className="flex gap-3">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted"><Icon className="size-3.5" aria-hidden /></span>
                      <div><p className="text-sm">{a.description}</p><p className="text-xs text-muted">{formatDate(a.date)}</p></div>
                    </li>
                  );
                })}
              </ul>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>{children}</section>;
}
function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-4 border-b py-2 last:border-0"><span className="text-muted">{k}</span><span className="min-w-0 text-right font-medium">{v}</span></div>;
}
