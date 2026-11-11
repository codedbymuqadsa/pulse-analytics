import type { AcquisitionChannelName, BillingInterval, PlanTier } from "@/types/analytics";
import type { Customer, CustomerStatus, PlanChange } from "@/types/customer";
import { DATA_DAYS, dateAtIndex } from "@/lib/date-range";
import { CAMPAIGNS, mrrFor, PLAN_TIERS } from "./constants";
import { mulberry32, pick, weighted } from "./random";

const FIRST = ["Ava", "Liam", "Noah", "Emma", "Olivia", "Mateo", "Sofia", "Lucas", "Mia", "Ethan", "Zara", "Omar", "Priya", "Kenji", "Amara", "Hugo", "Freya", "Diego", "Leila", "Jonas", "Nadia", "Tomas", "Ingrid", "Rafael", "Chloe", "Arjun", "Elena", "Felix", "Hana", "Isaac", "Julia", "Kofi", "Lena", "Marco", "Nora", "Oscar", "Petra", "Quinn", "Rosa", "Stefan"];
const LAST = ["Alvarez", "Bennett", "Chen", "Dubois", "Eriksen", "Fischer", "Garcia", "Haddad", "Ivanov", "Jensen", "Kowalski", "Lindqvist", "Moreau", "Nakamura", "Okafor", "Petrov", "Quintero", "Rossi", "Santos", "Tanaka", "Underwood", "Varga", "Winters", "Xu", "Yilmaz", "Zielinski", "Abbott", "Brandt", "Castillo", "Delgado"];
const CO_A = ["Northwind", "Bluepeak", "Lumen", "Harbor", "Quartz", "Ember", "Willow", "Atlas", "Cobalt", "Juniper", "Meridian", "Sable", "Tidal", "Vertex", "Zephyr", "Alder", "Briar", "Cedar", "Drift", "Fable"];
const CO_B = ["Labs", "Systems", "Works", "Health", "Logistics", "Studio", "Cloud", "Foods", "Robotics", "Capital", "Media", "Energy", "Analytics", "Supply", "Learning"];

export const ANCHOR_INDEX = DATA_DAYS - 1;
const HAZARD: Record<PlanTier, number> = { Starter: 0.0008, Professional: 0.00055, Business: 0.0004, Enterprise: 0.0002 };

function generate(): Customer[] {
  const rng = mulberry32(20261018);
  const out: Customer[] = [];
  const usedEmails = new Set<string>();

  for (let day = 0; day < DATA_DAYS; day++) {
    const base = 0.8 + 2.6 * Math.pow(day / DATA_DAYS, 1.3);
    const count = Math.floor(base) + (rng() < base - Math.floor(base) ? 1 : 0);
    for (let k = 0; k < count; k++) {
      const first = pick(rng, FIRST);
      const last = pick(rng, LAST);
      const companyBase = `${pick(rng, CO_A)} ${pick(rng, CO_B)}`;
      const slug = companyBase.toLowerCase().replace(/\s+/g, "");
      let email = `${first}.${last}@${slug}.example`.toLowerCase();
      let n = 2;
      while (usedEmails.has(email)) email = `${first}.${last}${n++}@${slug}.example`.toLowerCase();
      usedEmails.add(email);

      const plan = weighted<PlanTier>(rng, [["Starter", 62], ["Professional", 27], ["Business", 9], ["Enterprise", 2]]);
      const annualP = plan === "Enterprise" ? 0.8 : plan === "Business" ? 0.5 : plan === "Professional" ? 0.38 : 0.25;
      const billing: BillingInterval = rng() < annualP ? "annual" : "monthly";
      const channel = weighted<AcquisitionChannelName>(rng, [
        ["Organic Search", 32], ["Paid Search", 20], ["Social", 10], ["Referral", 14], ["Direct", 15], ["Email", 9],
      ]);
      const camps = CAMPAIGNS.filter((c) => c.channel === channel);
      const campaign = weighted(rng, camps.map((c) => [c.name, c.weight] as const));

      const initialMrr = mrrFor(plan, billing);
      let currentPlan = plan;
      let currentMrr = initialMrr;
      let status: CustomerStatus = "active";
      let canceledIdx: number | null = null;

      // Recent signups are still on trial about half the time.
      const trialing = ANCHOR_INDEX - day < 14 && rng() < 0.5;
      const planChanges: PlanChange[] = [];

      if (trialing) {
        status = "trialing";
      } else {
        const life = -Math.log(1 - rng()) / HAZARD[plan];
        const cIdx = day + Math.max(5, Math.round(life));
        if (cIdx < ANCHOR_INDEX) canceledIdx = cIdx;

        if (rng() < 0.15) {
          const earliest = day + 30;
          const latest = (canceledIdx ?? ANCHOR_INDEX) - 5;
          if (latest > earliest) {
            const at = earliest + Math.floor(rng() * (latest - earliest));
            const ti = PLAN_TIERS.indexOf(plan);
            const up = rng() < 0.7;
            const target = PLAN_TIERS[up ? Math.min(3, ti + 1) : Math.max(0, ti - 1)];
            if (target !== plan) {
              const next = mrrFor(target, billing);
              planChanges.push({ date: dateAtIndex(at), from: plan, to: target, deltaMrr: Math.round((next - initialMrr) * 100) / 100 });
              currentPlan = target;
              currentMrr = next;
            }
          }
        }
        if (canceledIdx !== null) status = "canceled";
        else if (day < ANCHOR_INDEX - 45 && rng() < 0.03) status = "past_due";
      }

      const lastIdx = status === "canceled" ? Math.max(day, (canceledIdx ?? day) - Math.floor(rng() * 4))
        : status === "past_due" ? ANCHOR_INDEX - (10 + Math.floor(rng() * 30))
        : status === "trialing" ? ANCHOR_INDEX - Math.floor(rng() * 4)
        : ANCHOR_INDEX - Math.floor(rng() * rng() * 30);

      out.push({
        id: `CUS-${String(1001 + out.length)}`,
        name: `${first} ${last}`,
        email,
        company: companyBase,
        plan: currentPlan,
        billing,
        mrr: status === "canceled" || status === "trialing" ? 0 : currentMrr,
        createdAt: dateAtIndex(day),
        lastActivityAt: dateAtIndex(Math.max(day, lastIdx)),
        canceledAt: canceledIdx === null ? null : dateAtIndex(canceledIdx),
        status,
        channel,
        campaign,
        initialMrr,
        initialPlan: plan,
        planChanges,
      });
    }
  }
  return out;
}

let cache: Customer[] | null = null;
/** All customer records (deterministic, generated once per process). */
export function allCustomers(): Customer[] {
  return (cache ??= generate());
}

/** MRR a customer contributed on a given day index (0 before signup / after cancel / while trialing). */
export function mrrOnDate(c: Customer, iso: string): number {
  if (c.status === "trialing" || iso < c.createdAt) return 0;
  if (c.canceledAt && iso >= c.canceledAt) return 0;
  let m = c.initialMrr;
  for (const ch of c.planChanges) if (ch.date <= iso) m += ch.deltaMrr;
  return Math.round(m * 100) / 100;
}

export function planOnDate(c: Customer, iso: string): PlanTier {
  let p = c.initialPlan;
  for (const ch of c.planChanges) if (ch.date <= iso) p = ch.to;
  return p;
}
