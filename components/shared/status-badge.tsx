import { AlertCircle, CheckCircle2, Clock, PauseCircle, Sparkles, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const MAP = {
  paid: { tone: "success", label: "Paid", icon: CheckCircle2 },
  pending: { tone: "warning", label: "Pending", icon: Clock },
  failed: { tone: "danger", label: "Failed", icon: XCircle },
  active: { tone: "success", label: "Active", icon: CheckCircle2 },
  trialing: { tone: "info", label: "Trialing", icon: Sparkles },
  past_due: { tone: "warning", label: "Past due", icon: AlertCircle },
  canceled: { tone: "neutral", label: "Canceled", icon: PauseCircle },
  draft: { tone: "info", label: "Draft", icon: Clock },
  archived: { tone: "neutral", label: "Archived", icon: PauseCircle },
} as const;

export type StatusKey = keyof typeof MAP;

export const STATUS_LABELS: Record<StatusKey, string> = Object.fromEntries(Object.entries(MAP).map(([k, v]) => [k, v.label])) as Record<StatusKey, string>;

/** Status is always conveyed by icon + text, never color alone. */
export function StatusBadge({ status }: { status: StatusKey }) {
  const m = MAP[status];
  const Icon = m.icon;
  return <Badge tone={m.tone}><Icon className="size-3" aria-hidden />{m.label}</Badge>;
}
