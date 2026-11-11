import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import { ChannelChart, ChannelTable, FunnelCard, SignupsTrend } from "@/components/acquisition/acquisition-widgets";
import { MetricCard } from "@/components/dashboard/metric-card";
import { CompareToggle } from "@/components/shared/date-range-picker";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { UrlFilters } from "@/components/shared/url-filters";
import { parseCompare, resolveRange } from "@/lib/date-range";
import { parseAggregation } from "@/lib/filters";
import { CAMPAIGNS, CHANNELS } from "@/lib/mock-data/constants";
import { campaignOptions, getAcquisitionData } from "@/lib/repositories/acquisition";

export const metadata: Metadata = { title: "Acquisition" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AcquisitionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const range = resolveRange(sp);
  const compare = parseCompare(sp);
  const agg = parseAggregation(sp, range.days);
  const channel = CHANNELS.find((c) => c === one(sp.channel));
  const campaignRaw = CAMPAIGNS.find((c) => c.name === one(sp.campaign));
  // A campaign only applies when it belongs to the selected channel.
  const campaign = campaignRaw && (!channel || campaignRaw.channel === channel) ? campaignRaw.name : undefined;

  const data = await getAcquisitionData(range, { channel, campaign }, compare, agg);

  return (
    <>
      <PageHeader title="Acquisition" description="Where visitors come from and what it costs to turn them into customers." actions={<CompareToggle id="compare-acq" />} />
      <div className="space-y-6">
        <UrlFilters
          filters={[
            { param: "channel", label: "Channel", value: channel, allLabel: "All channels", options: CHANNELS.map((c) => ({ value: c, label: c })) },
            { param: "campaign", label: "Campaign", value: campaign, allLabel: "All campaigns", options: campaignOptions(channel).map((c) => ({ value: c, label: c })) },
          ]}
        />
        {data.empty || data.funnel.visitors === 0 ? (
          <EmptyState icon={SearchX} title="No acquisition data" description="Nothing matches this combination of date range, channel and campaign." />
        ) : (
          <>
            <section aria-label="Acquisition metrics" className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 xl:grid-cols-4">
              {data.kpis.map((k) => (
                <MetricCard key={k.id} label={k.label} description={k.description} value={k.value} format={k.format} change={k.change} polarity={k.polarity} showChange={compare} />
              ))}
            </section>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <FunnelCard funnel={data.funnel} />
              <ChannelChart rows={data.channels} />
            </div>
            <SignupsTrend data={data.trend} agg={agg} />
            <ChannelTable rows={data.channels} />
            <p className="text-[13px] text-muted">
              Attribution is last-touch: each paid customer is credited to one campaign. Spend is a fixed daily budget per campaign. Visitor, signup and activation counts are simulated from each channel&apos;s funnel ratios.
            </p>
          </>
        )}
      </div>
    </>
  );
}
