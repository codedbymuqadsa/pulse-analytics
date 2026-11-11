# Pulse Analytics

A SaaS business-intelligence dashboard for founders, product managers and revenue teams: MRR, subscriptions, customers, acquisition funnel, plans and saved reports.

> **Front-end only.** The dataset (customers, revenue, campaigns) is generated deterministically in code, and accounts, preferences and saved items are stored in the browser's `localStorage`. There is no backend, no analytics ingestion and no server-side authentication. Sign-up and sign-in work end to end in the browser, but they are **not server-side security**. See [Account and sign-in model](#account-and-sign-in-model).

## Features

- **App shell**: collapsible sidebar (preference saved), workspace switcher, breadcrumbs, global date-range picker, command palette (`Ctrl/Cmd + K`), notifications, light/dark/system theme, profile menu, mobile navigation drawer.
- **Overview**: six KPI cards (derived values, period-over-period change, polarity-aware trend colours, sparklines, metric tooltips), revenue chart with previous-period overlay and daily/weekly/monthly aggregation, MRR-by-plan donut, customer growth chart, searchable/sortable/paginated transactions table with detail dialog and CSV export, top customers, dashboard customization (show/hide widgets, restore defaults).
- **Revenue**: MRR/ARR/new/expansion/contraction/churned MRR, new-vs-recurring chart, MRR movement breakdown, sortable revenue-by-plan table, filters for plan, billing interval and subscription status.
- **Customers**: server-driven search, plan/status/created filters, sort, pagination (10/25/50), row selection with select-all-on-page, bulk labels (persisted locally), details drawer (profile, subscription, revenue history, activity, transactions), CSV export of the *filtered* set.
- **Acquisition**: visitors, signups, conversion, CAC, funnel with step conversion and drop-off, channel chart and table, signups trend, filters for channel and campaign, empty state.
- **Products**: plan table, overview chart, plan detail drawer, validated add/edit forms, delete confirmation (sample data only).
- **Reports**: library with search/filter/sort, report builder with live preview, save/duplicate/rename/delete (confirmation), detail page with CSV export. Stored in `localStorage`.
- **Settings**: workspace, default range and comparison, time zone, number format, theme, sidebar default, widgets, profile. Validated, with save / cancel / reset.
- **States**: loading skeletons (`loading.tsx`), error boundary with retry, not-found pages, empty states, retryable fetches for report and customer data.
- **State in the URL**: `?range=30d&compare=true&agg=week` (plus `from`/`to` for custom ranges) and per-page filters (`plan`, `status`, `q`, `sort`, `page`, ...). Invalid values fall back safely; back/forward restores state.

## Technology

Next.js 15 (App Router, Server Components by default) · React 19 · TypeScript (strict) · Tailwind CSS 3 with CSS-variable design tokens · Radix UI primitives (shadcn-style wrappers in `components/ui`) · Recharts · TanStack Table · React Hook Form + Zod · date-fns · Lucide · Sonner · next-themes · Vitest + Testing Library · Playwright.

## Getting started

Prerequisites: Node.js 20+ and npm.

```bash
npm install
npm run dev          # http://localhost:3000
```

Open the app, choose **Create an account** (`/signup`), and you are signed in and taken to the dashboard. Accounts live in the browser you used, so sign in again with the same email and password in that browser.

```bash
npm run build        # production build
npm start            # serve the production build
npm run lint
npm run typecheck
npm test             # Vitest unit + component tests
npm run test:e2e     # Playwright (builds and serves on port 3100)
```

First-time Playwright setup: `npx playwright install chromium`.

No environment variables or API keys are required.

## Project structure

```
app/                 routes (login, dashboard/*, api/*), error / loading / not-found
components/
  ui/                primitives (button, dialog, select, dropdown, tabs, tooltip...)
  layout/            sidebar, header, command palette, notifications, shell
  shared/            data table, date-range picker, filters, export button, states
  dashboard/ revenue/ customers/ acquisition/ products/ reports/ settings/ charts/
hooks/               useUrlState, useFormatters, useMounted
lib/
  mock-data/         deterministic generators (customers, series, transactions, acquisition...)
  repositories/      async, server-only data access used by pages and API routes
  calculations.ts formatters.ts csv.ts date-range.ts filters.ts metrics.ts validations.ts
  store.ts stores.ts localStorage-backed external stores
types/               domain types
tests/ e2e/          Vitest and Playwright suites
```

## Mock data architecture

Data is **event-sourced from customer records**, so totals reconcile by construction:

1. `lib/mock-data/customers.ts` generates ~1,460 customers with a seeded PRNG (`mulberry32`): signup date, plan, billing interval, acquisition channel/campaign, at most one plan change, and an optional cancellation.
2. `revenue.ts` replays those records into a daily series (MRR, new/expansion/contraction/churned MRR, customers, subscriptions).
3. `transactions.ts` creates invoices from each customer's billing cycle.
4. `acquisition.ts` derives campaign/day rows: paid customers are the real customer records; upstream funnel counts come from per-channel ratios.
5. `lib/repositories/*` expose typed async functions (`getDashboardMetrics`, `getRevenueData`, `getCustomers`, `getTransactionsPage`, `getAcquisitionData`, ...). Pages and `app/api/*` route handlers call only these, so replacing the mock implementations with real API calls does not require touching the UI.

The dataset ends on a fixed date (`DEMO_END = 2026-10-18`), so there are no `Date.now()`-driven numbers and tests are stable.

## Metric assumptions

| Metric | Definition |
| --- | --- |
| MRR | Sum of monthly-normalised price of paying customers (annual plans: 20% discount, ÷ 12). Trials and cancelled accounts contribute 0. |
| ARR | MRR × 12 (run-rate, not recognised revenue). |
| Net MRR movement | New + Expansion − Contraction − Churned. `MRR(end) − MRR(start)` equals net movement (unit-tested). |
| Recognised revenue | `MRR ÷ 30` per day. "New" revenue is MRR added in the trailing 30 days ÷ 30; the remainder is recurring. |
| Total customers | Every customer record created up to the end of the period, including cancelled and trialing accounts. |
| Active subscriptions | Paying subscriptions (active + past due), one per customer. |
| ARPA | MRR ÷ active subscriptions. |
| Churn rate | Customers cancelled in the period ÷ active subscriptions at its start, normalised to 30 days. Lower is better. |
| Percent change | `(current − previous) / |previous|`; `null` (shown as "No prior data") when the previous value is 0 or missing. |
| Conversion rate | Signups ÷ visitors. |
| CAC | Total spend ÷ paid customers acquired. Spend is a fixed daily budget per campaign. |
| Attribution | Last-touch; each customer is credited to a single campaign. Visitor/signup/activation counts are simulated. |
| Top customers | Ranked by paid invoice total in the selected period. |

The generated figures are illustrative and intentionally internally consistent (for example ARPA = MRR ÷ subscriptions), so they differ from the round example numbers in the brief.

## Account and sign-in model

- `/signup` collects name, email, optional workspace name and a password (8+ characters with a letter and a number, confirmed, terms accepted). The account is saved in `localStorage` with a **salted PBKDF2 (SHA-256, 120k iterations) password hash**, never the plain password, and the user is signed in immediately.
- `/login` verifies the email and password against the stored hash and returns one generic error for unknown email or wrong password. "Remember me" makes the session cookie persistent (30 days).
- A session cookie (`pulse-session`) lets `middleware.ts` redirect signed-out visitors to `/login`. If the stored account is missing (for example site data was cleared) the app signs the user out.
- Settings profile edits (name, email, workspace) are written back to the account.
- **Limits:** accounts exist only in that browser profile, cannot be recovered or shared across devices, and anyone with access to the browser's storage can read or delete them. There is no password reset or email verification. `lib/auth.ts` is the single module to replace with a real provider.

## Persistence limitations

Preferences, widget visibility, saved reports, custom/edited plans, customer labels and notification read-state live in the browser's `localStorage`. They are **local to one browser profile**, are not synced, can be cleared by the user, and are validated on read (malformed data falls back to defaults). If storage is unavailable, changes apply for the session and the UI says so. The session cookie is a plain client-set flag used for route gating, not a server-validated session.

## Architecture decisions and trade-offs

- **Server Components by default**; client components only for interactivity. Pages read `searchParams`, call repositories on the server and pass serialisable props down.
- **URL as state** for filters/sort/pagination so views are shareable and back/forward works. Cost: each filter change is a navigation (debounced for search, shown with a pending state).
- **Server-side filtering for large tables** (customers, transactions) keeps client payloads small and gives CSV export a single source of truth via `/api/export/*`.
- **Formatting happens in client components** so number-format preferences (locale, compact numbers) apply without a server round-trip.
- **Charts render after mount**: Recharts generates ids from a module counter that differs between server and client, which causes hydration warnings; the chart frame keeps its height to avoid layout shift. Each chart has an accessible description and a "View data table" alternative.
- **Recharts 2 with React 19** needs `react-is` pinned to v19 (see `overrides` in `package.json`).
- **Colour**: semantic tokens as CSS variables (light and dark); status is always icon + text; categorical chart colours follow a fixed order per entity.
- Primary buttons use the brand `#6366F1` with white semibold text (about 4.5:1). Verify contrast again if the palette changes.

## Testing

- `tests/lib.test.ts`: formatting, percent change and zero handling, CSV escaping, date ranges, MRR roll-forward identity, revenue shares, CAC/conversion, filter combinations, sorting, pagination, URL parsing, schemas.
- `tests/components.test.tsx`: metric card (polarity, fallbacks, locale), debounced search, table sorting/selection/pagination/keyboard, URL filter chips, login validation, theme toggle, widget visibility.
- `e2e/app.spec.ts`: sign-up, sign-in and sign-out, navigation, date range and back/forward, custom range validation, invalid URL params, comparison toggle, transactions filter/sort/paginate/details, widget customization persistence, CSV exports (contents asserted), customers filter/sort/paginate/drawer/bulk labels, report create/rename/duplicate/delete, product plan form, settings and theme persistence, command palette, notifications, responsive navigation and overflow at 360/390/768/1024 px, not-found routes.

## Deployment

The app is a standard Next.js build and needs no environment variables.

```bash
npm run build && npm start
```

It deploys unchanged to any Node host or to Vercel (`vercel`). The `middleware.ts` gate only checks a client-set cookie; replace it with server-side session validation when adding real authentication.

## Toward a production integration

- **Authentication and authorisation**: a real provider (OIDC/SAML), server-side session validation in middleware and route handlers, per-workspace roles and row-level authorisation.
- **Persistence**: move reports, plans, labels and preferences from `localStorage` to a database with per-user ownership and audit history.
- **Data ingestion**: event/billing ingestion (webhooks from the billing system, product analytics events), idempotent writes and schema validation.
- **Background processing**: scheduled jobs to compute and cache daily metric snapshots instead of replaying events per request; invalidation and backfills.
- **API layer**: implement the repository interfaces against the real API, add pagination cursors, rate limiting, error taxonomy and observability.
- **Exports**: stream large CSV exports; add PDF export server-side if required.

## Known limitations and future improvements

- Accounts and sign-in are browser-local (no password reset, no email verification, no cross-device accounts).
- The analytics dataset is generated sample data; connect the repository layer to a real source before using it for decisions.
- PDF export is not implemented (CSV only).
- Time zone only affects the footer clock; the dataset is date-based and timezone-agnostic.
- Currency is USD only; plan edits cannot change price, tier or interval after creation.
- The default range and comparison preference are applied client-side after load when the URL has no explicit value, which causes a brief navigation on first open.
- Possible next steps: saved dashboard layouts with drag-and-drop, scheduled report emails, cohort retention analysis, i18n.
