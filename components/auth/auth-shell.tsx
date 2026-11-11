import { Activity, BarChart3, Gauge, TrendingUp } from "lucide-react";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="flex flex-col justify-center px-6 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-fg"><Activity className="size-5" strokeWidth={2.5} aria-hidden /></span>
            <span className="text-xl font-semibold tracking-tight">Pulse Analytics</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
          {children}
        </div>
      </section>
      <aside className="hidden flex-col justify-between bg-sidebar p-12 text-sidebar-fg lg:flex" aria-hidden>
        <div className="flex items-center gap-2 text-sm text-sidebar-muted"><Gauge className="size-4" /> Business intelligence for SaaS teams</div>
        <div className="space-y-6">
          <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight">Understand your revenue, retention and growth in one place.</h2>
          <ul className="space-y-3 text-sm text-sidebar-muted">
            <li className="flex items-center gap-3"><TrendingUp className="size-5 text-[#a5b4fc]" /> MRR, churn and expansion with period comparison</li>
            <li className="flex items-center gap-3"><BarChart3 className="size-5 text-[#a5b4fc]" /> Funnel, channel and campaign performance</li>
          </ul>
        </div>
        <p className="text-xs text-sidebar-muted">© {new Date().getFullYear()} Pulse Analytics</p>
      </aside>
    </main>
  );
}
