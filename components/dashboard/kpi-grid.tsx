import { CircleDollarSign, Percent, TrendingUp, UserCheck, Users, Wallet } from "lucide-react";
import type { DashboardMetric, MetricId } from "@/types/analytics";
import { MetricCard } from "@/components/dashboard/metric-card";

const ICONS: Record<MetricId, React.ReactNode> = {
  mrr: <CircleDollarSign className="size-4" aria-hidden />,
  arr: <TrendingUp className="size-4" aria-hidden />,
  customers: <Users className="size-4" aria-hidden />,
  subscriptions: <UserCheck className="size-4" aria-hidden />,
  arpa: <Wallet className="size-4" aria-hidden />,
  churn: <Percent className="size-4" aria-hidden />,
};

export function KpiGrid({ metrics, compare }: { metrics: DashboardMetric[]; compare: boolean }) {
  return (
    <section aria-label="Key metrics" className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {metrics.map((m) => (
        <MetricCard key={m.id} label={m.label} description={m.description} value={m.value} format={m.format} change={m.change} polarity={m.polarity} showChange={compare} spark={m.spark} icon={ICONS[m.id]} />
      ))}
    </section>
  );
}
