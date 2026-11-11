import { describe, expect, it } from "vitest";
import { percentChange, ratioPercent, safeDivide, sum, trendFor } from "@/lib/calculations";
import { escapeCsvCell, toCsv } from "@/lib/csv";
import { DATA_START, DEMO_END, daysBetween, resolveRange, resolvePreset, validateCustomRange, parseCompare } from "@/lib/date-range";
import { formatCurrency, formatDate, formatNumber, formatPercent, formatSignedPercent } from "@/lib/formatters";
import { filterCustomers, filterTransactions, paginate, parseCustomerQuery, parseTransactionQuery, sortCustomers } from "@/lib/filters";
import { allCustomers } from "@/lib/mock-data/customers";
import { aggregateSeries, fullDaily, sliceDaily, sumFlows } from "@/lib/mock-data/revenue";
import { allTransactions } from "@/lib/mock-data/transactions";
import { cacOf, filterAcquisition, groupByChannel, totalFunnel } from "@/lib/mock-data/acquisition";
import { churnRate, computeMetrics, mrrMovement, revenueByPlan } from "@/lib/metrics";
import { computeReportSeries } from "@/lib/report-data";
import { customRangeSchema, loginSchema, planSchema, reportSchema, signupSchema } from "@/lib/validations";

describe("formatters", () => {
  it("formats currency with and without cents", () => {
    expect(formatCurrency(84250)).toBe("$84,250");
    expect(formatCurrency(68.4, {}, true)).toBe("$68.40");
  });
  it("supports locale and compact notation", () => {
    expect(formatCurrency(1234.5, { locale: "de-DE" }, true)).toContain("1.234,50");
    expect(formatNumber(12846, { compact: true })).toBe("12.8K");
    expect(formatNumber(999, { compact: true })).toBe("999");
  });
  it("handles non-finite values safely", () => {
    expect(formatCurrency(NaN)).toBe("—");
    expect(formatPercent(null)).toBe("—");
    expect(formatSignedPercent(null)).toBe("—");
  });
  it("formats percentages and dates", () => {
    expect(formatPercent(2.4)).toBe("2.4%");
    expect(formatSignedPercent(5.25)).toBe("+5.3%");
    expect(formatSignedPercent(-1)).toBe("−1.0%");
    expect(formatDate("2026-10-18")).toBe("Oct 18, 2026");
    expect(formatDate("garbage")).toBe("—");
    expect(formatDate(null)).toBe("—");
  });
});

describe("calculations", () => {
  it("computes percent change and guards zero / missing previous values", () => {
    expect(percentChange(110, 100)).toBeCloseTo(10);
    expect(percentChange(50, 100)).toBeCloseTo(-50);
    expect(percentChange(10, 0)).toBeNull();
    expect(percentChange(10, null)).toBeNull();
    expect(percentChange(0, 0)).toBeNull();
  });
  it("derives trend direction from metric polarity", () => {
    expect(trendFor(5, "up-good")).toBe("positive");
    expect(trendFor(-5, "up-good")).toBe("negative");
    expect(trendFor(-5, "down-good")).toBe("positive");
    expect(trendFor(5, "down-good")).toBe("negative");
    expect(trendFor(null, "up-good")).toBe("neutral");
    expect(trendFor(0.01, "up-good")).toBe("neutral");
  });
  it("handles zero denominators", () => {
    expect(ratioPercent(5, 0)).toBe(0);
    expect(safeDivide(5, 0)).toBeNull();
    expect(ratioPercent(1, 4)).toBe(25);
    expect(sum([])).toBe(0);
  });
});

describe("csv", () => {
  it("escapes commas, quotes and newlines", () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell("line1\nline2")).toBe('"line1\nline2"');
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(0)).toBe("0");
  });
  it("neutralises spreadsheet formula injection in text but not numbers", () => {
    expect(escapeCsvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(escapeCsvCell(-5)).toBe("-5");
  });
  it("writes headers and CRLF rows", () => {
    expect(toCsv(["a", "b"], [[1, "x,y"]])).toBe('a,b\r\n1,"x,y"\r\n');
  });
});

describe("date ranges", () => {
  it("resolves presets with an equal-length previous period", () => {
    const r = resolvePreset("30d");
    expect(r.days).toBe(30);
    expect(r.to).toBe(DEMO_END);
    expect(daysBetween(r.previous.from, r.previous.to)).toBe(30);
    expect(r.previous.to < r.from).toBe(true);
  });
  it("resolves last month and this month", () => {
    expect(resolvePreset("lm")).toMatchObject({ from: "2026-09-01", to: "2026-09-30" });
    expect(resolvePreset("mtd")).toMatchObject({ from: "2026-10-01", to: DEMO_END });
  });
  it("falls back to 30d for invalid params", () => {
    expect(resolveRange({ range: "nope" }).preset).toBe("30d");
    expect(resolveRange({ range: "custom", from: "2026-10-10", to: "2026-10-01" }).error).toMatch(/start date/);
    expect(resolveRange({ range: "custom", from: "bad", to: "bad" }).error).toBeTruthy();
  });
  it("accepts a valid custom range", () => {
    const r = resolveRange({ range: "custom", from: "2026-09-01", to: "2026-09-10" });
    expect(r.preset).toBe("custom");
    expect(r.days).toBe(10);
    expect(r.error).toBeUndefined();
  });
  it("validates custom ranges", () => {
    expect(validateCustomRange("2026-01-01", "2026-12-31")).toMatch(/available from/);
    expect(validateCustomRange("2020-01-01", "2020-01-05")).toMatch(/available from/);
    expect(validateCustomRange("2026-10-01", "2026-10-05")).toBeNull();
    expect(customRangeSchema.safeParse({ from: "2026-10-05", to: "2026-10-01" }).success).toBe(false);
  });
  it("parses compare flag", () => {
    expect(parseCompare({ compare: "false" })).toBe(false);
    expect(parseCompare({ compare: "true" })).toBe(true);
    expect(parseCompare({ compare: "weird" })).toBe(true);
    expect(parseCompare({}, false)).toBe(false);
  });
});

describe("demo data consistency", () => {
  const daily = fullDaily();
  const last = daily[daily.length - 1];

  it("is deterministic", () => {
    expect(allCustomers().length).toBe(allCustomers().length);
    expect(allCustomers()[0].email).toBe(allCustomers()[0].email);
    expect(allTransactions()[0].id).toBe("TX-100001");
  });
  it("uses reserved .example email domains", () => {
    expect(allCustomers().every((c) => c.email.endsWith(".example"))).toBe(true);
    expect(new Set(allCustomers().map((c) => c.email)).size).toBe(allCustomers().length);
  });
  it("ties headline totals to customer records", () => {
    const cs = allCustomers();
    expect(last.totalCustomers).toBe(cs.length);
    const paying = cs.filter((c) => c.status === "active" || c.status === "past_due").length;
    expect(last.activeSubscriptions).toBe(paying);
    const mrr = cs.reduce((a, c) => a + c.mrr, 0);
    expect(last.mrr).toBeCloseTo(mrr, 0);
  });
  it("satisfies the MRR roll-forward identity over any window", () => {
    const range = { from: "2026-08-01", to: "2026-09-30" };
    const rows = sliceDaily(daily, range);
    const startMrr = daily[daily.findIndex((r) => r.date === range.from) - 1].mrr;
    const endMrr = rows[rows.length - 1].mrr;
    const m = mrrMovement(rows);
    expect(startMrr + m.net).toBeCloseTo(endMrr, 1);
  });
  it("aggregates flows by sum and stocks by last value", () => {
    const rows = sliceDaily(daily, { from: "2026-09-01", to: "2026-09-30" });
    const monthly = aggregateSeries(rows, "month");
    expect(monthly).toHaveLength(1);
    expect(monthly[0].revenue).toBeCloseTo(sumFlows(rows).revenue, 1);
    expect(monthly[0].mrr).toBe(rows[rows.length - 1].mrr);
    expect(aggregateSeries(rows, "week").length).toBeGreaterThanOrEqual(4);
  });
  it("splits revenue into new + recurring", () => {
    for (const r of daily.slice(-30)) expect(r.newRevenue + r.recurringRevenue).toBeCloseTo(r.revenue, 1);
  });
  it("revenue shares sum to ~100%", () => {
    const rows = revenueByPlan(allCustomers(), resolvePreset("30d"), resolvePreset("30d").previous);
    expect(rows.reduce((a, r) => a + r.share, 0)).toBeCloseTo(100, 5);
    expect(new Set(rows.map((r) => r.share.toFixed(2))).size).toBeGreaterThan(1);
  });
  it("computes dashboard metrics with comparison and polarity", () => {
    const range = resolvePreset("30d");
    const metrics = computeMetrics(daily, range, true);
    expect(metrics.map((m) => m.id)).toEqual(["mrr", "arr", "customers", "subscriptions", "arpa", "churn"]);
    const mrr = metrics[0];
    const arr = metrics[1];
    expect(arr.value).toBeCloseTo(mrr.value * 12, 2);
    expect(mrr.change).toBeCloseTo(((mrr.value - mrr.previousValue!) / mrr.previousValue!) * 100, 5);
    expect(metrics[4].value).toBeCloseTo(mrr.value / metrics[3].value, 5);
    expect(metrics[5].polarity).toBe("down-good");
    const off = computeMetrics(daily, range, false);
    expect(off.every((m) => m.change === null && m.previousValue === null)).toBe(true);
  });
  it("returns null churn when there is no history before the range", () => {
    expect(churnRate(daily, { from: DATA_START, to: "2024-12-31" })).toBeNull();
  });
});

describe("acquisition", () => {
  const range = resolvePreset("90d");
  it("computes CAC = spend / customers and conversion from visitors", () => {
    const rows = filterAcquisition({ range });
    const f = totalFunnel(rows);
    expect(cacOf(f.spend, f.customers)).toBeCloseTo(f.spend / f.customers, 6);
    expect(cacOf(100, 0)).toBeNull();
    for (const ch of groupByChannel(rows)) {
      expect(ch.conversionRate).toBeCloseTo((ch.signups / ch.visitors) * 100, 6);
    }
  });
  it("ties acquired customers to customer records", () => {
    const f = totalFunnel(filterAcquisition({ range }));
    const created = allCustomers().filter((c) => c.createdAt >= range.from && c.createdAt <= range.to).length;
    expect(f.customers).toBe(created);
  });
  it("filters by channel and campaign and can be empty", () => {
    const paid = filterAcquisition({ range, channel: "Paid Search" });
    expect(paid.every((r) => r.channel === "Paid Search")).toBe(true);
    expect(filterAcquisition({ range, channel: "Social", campaign: "Brand Search" })).toHaveLength(0);
  });
  it("shows funnel steps shrinking", () => {
    const f = totalFunnel(filterAcquisition({ range }));
    expect(f.visitors).toBeGreaterThan(f.signups);
    expect(f.signups).toBeGreaterThan(f.activated);
    expect(f.activated).toBeGreaterThan(f.customers);
  });
});

describe("filters", () => {
  const customers = allCustomers();
  it("combines search, plan and status filters", () => {
    const base = filterCustomers(customers, { q: "", plan: undefined, status: undefined, since: undefined }, DEMO_END);
    expect(base).toHaveLength(customers.length);
    const plan = filterCustomers(customers, { q: "", plan: "Business", status: undefined, since: undefined }, DEMO_END);
    const both = filterCustomers(customers, { q: "", plan: "Business", status: "active", since: undefined }, DEMO_END);
    expect(plan.every((c) => c.plan === "Business")).toBe(true);
    expect(both.length).toBeLessThanOrEqual(plan.length);
    expect(both.every((c) => c.plan === "Business" && c.status === "active")).toBe(true);
  });
  it("searches name, email and company case-insensitively", () => {
    const target = customers[10];
    expect(filterCustomers(customers, { q: target.email.toUpperCase() }, DEMO_END).map((c) => c.id)).toContain(target.id);
    expect(filterCustomers(customers, { q: target.company.toLowerCase() }, DEMO_END).length).toBeGreaterThan(0);
    expect(filterCustomers(customers, { q: "zzzz-no-match" }, DEMO_END)).toHaveLength(0);
  });
  it("filters by creation window", () => {
    const recent = filterCustomers(customers, { q: "", since: "30d" }, DEMO_END);
    expect(recent.length).toBeGreaterThan(0);
    expect(recent.every((c) => c.createdAt >= "2026-09-19")).toBe(true);
  });
  it("sorts using real values (numeric mrr, plan order)", () => {
    const asc = sortCustomers(customers, "mrr", "asc");
    expect(asc[0].mrr).toBeLessThanOrEqual(asc[asc.length - 1].mrr);
    const byPlan = sortCustomers(customers, "plan", "desc");
    expect(byPlan[0].plan).toBe("Enterprise");
  });
  it("paginates and clamps out-of-range pages", () => {
    const p = paginate(customers, 9999, 10);
    expect(p.page).toBe(p.pageCount);
    expect(p.rows.length).toBeGreaterThan(0);
    expect(paginate([], 1, 10)).toMatchObject({ total: 0, pageCount: 1, rows: [] });
  });
  it("parses invalid query params gracefully", () => {
    const q = parseCustomerQuery({ plan: "Nope", status: ["active"], sort: "hack", dir: "sideways", page: "-4", size: "7" });
    expect(q).toMatchObject({ plan: undefined, status: "active", sort: "createdAt", dir: "desc", page: 1, pageSize: 10 });
    expect(parseTransactionQuery({ tstatus: "paid", tpage: "abc" })).toMatchObject({ status: "paid", page: 1 });
  });
  it("filters transactions by range, status and text", () => {
    const range = resolvePreset("7d");
    const all = filterTransactions(allTransactions(), { q: "" }, range);
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((t) => t.date >= range.from && t.date <= range.to)).toBe(true);
    const failed = filterTransactions(allTransactions(), { q: "", status: "failed" }, range);
    expect(failed.every((t) => t.status === "failed")).toBe(true);
    expect(filterTransactions(allTransactions(), { q: all[0].id }, range).map((t) => t.id)).toContain(all[0].id);
  });
});

describe("report data", () => {
  it("returns a single series without grouping", () => {
    const s = computeReportSeries({ metric: "revenue", chartType: "line", range: "30d", groupBy: "none" });
    expect(s.keys).toEqual(["Total"]);
    expect(s.rows.length).toBe(30);
  });
  it("group totals equal the ungrouped total", () => {
    const grouped = computeReportSeries({ metric: "mrr", chartType: "area", range: "30d", groupBy: "plan" });
    const total = computeReportSeries({ metric: "mrr", chartType: "area", range: "30d", groupBy: "none" });
    const lastG = grouped.rows[grouped.rows.length - 1];
    const sumG = grouped.keys.reduce((a, k) => a + Number(lastG[k]), 0);
    expect(sumG).toBeCloseTo(Number(total.rows[total.rows.length - 1].Total), 0);
  });
});

describe("validation schemas", () => {
  it("validates login", () => {
    expect(loginSchema.safeParse({ email: "bad", password: "x", remember: true }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.example", password: "", remember: true }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.example", password: "longenough", remember: false }).success).toBe(true);
    const r = loginSchema.safeParse({ email: "", password: "", remember: true });
    expect(r.success).toBe(false);
  });
  it("validates signup", () => {
    const ok = { name: "Ada Lovelace", email: "ada@x.com", workspace: "", password: "engine1842", confirmPassword: "engine1842", terms: true };
    expect(signupSchema.safeParse(ok).success).toBe(true);
    expect(signupSchema.safeParse({ ...ok, password: "short1", confirmPassword: "short1" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...ok, password: "allletters", confirmPassword: "allletters" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...ok, confirmPassword: "other1234" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...ok, terms: false }).success).toBe(false);
  });
  it("validates reports and plans", () => {
    const base = { name: "My report", description: "", category: "Revenue", metric: "mrr", chartType: "line", range: "30d", groupBy: "none" };
    expect(reportSchema.safeParse(base).success).toBe(true);
    expect(reportSchema.safeParse({ ...base, name: "ab" }).success).toBe(false);
    expect(reportSchema.safeParse({ ...base, metric: "nope" }).success).toBe(false);
    const plan = { name: "Team", tier: "Starter", interval: "monthly", price: 10, status: "draft", description: "A new plan" };
    expect(planSchema.safeParse(plan).success).toBe(true);
    expect(planSchema.safeParse({ ...plan, price: 0 }).success).toBe(false);
    expect(planSchema.safeParse({ ...plan, price: Number.NaN }).success).toBe(false);
  });
});
