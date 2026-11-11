import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "next-themes";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const replace = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(search),
}));

import { MetricCard } from "@/components/dashboard/metric-card";
import { WidgetGate } from "@/components/dashboard/widget-gate";
import { DataTable, type Column } from "@/components/shared/data-table";
import { SearchInput } from "@/components/shared/search-input";
import { UrlFilters } from "@/components/shared/url-filters";
import { LoginForm } from "@/components/login-form";
import { SignupForm } from "@/components/signup-form";
import { getCurrentAccount, signOut, signUp } from "@/lib/auth";
import { ThemeToggle } from "@/components/layout/app-header";
import { TooltipProvider } from "@/components/ui/controls";
import { DEFAULT_PREFERENCES, preferencesStore } from "@/lib/stores";

const wrap = (ui: React.ReactNode) => render(<ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="t"><TooltipProvider>{ui}</TooltipProvider></ThemeProvider>);

beforeEach(() => {
  push.mockClear();
  replace.mockClear();
  search = "";
  window.localStorage.clear();
  preferencesStore.reset();
  document.documentElement.className = "";
  document.cookie = "pulse-session=; path=/; max-age=0";
});

describe("MetricCard", () => {
  it("renders label, formatted value and favourable change for churn going down", () => {
    wrap(<MetricCard label="Churn Rate" description="Lower is better" value={2.4} format="percent" change={-8.5} polarity="down-good" />);
    expect(screen.getByText("Churn Rate")).toBeInTheDocument();
    expect(screen.getByTestId("metric-value")).toHaveTextContent("2.4%");
    expect(screen.getByText(/favorable/)).toBeInTheDocument();
  });
  it("marks a rise in churn as unfavourable", () => {
    wrap(<MetricCard label="Churn" description="d" value={3} format="percent" change={10} polarity="down-good" />);
    expect(screen.getByText(/unfavorable/)).toBeInTheDocument();
  });
  it("shows a safe fallback when there is no comparison value", () => {
    wrap(<MetricCard label="MRR" description="d" value={84250} format="currency" change={null} polarity="up-good" />);
    expect(screen.getByTestId("metric-value")).toHaveTextContent("$84,250");
    expect(screen.getByText("No prior data")).toBeInTheDocument();
  });
  it("hides the comparison when compare is off", () => {
    wrap(<MetricCard label="MRR" description="d" value={1} format="number" change={5} polarity="up-good" showChange={false} />);
    expect(screen.queryByText(/vs prev/)).not.toBeInTheDocument();
    expect(screen.getByText("Comparison off")).toBeInTheDocument();
  });
  it("respects the number-format preference", () => {
    preferencesStore.set((p) => ({ ...p, locale: "de-DE" }));
    wrap(<MetricCard label="Customers" description="d" value={12846} format="number" change={null} polarity="up-good" />);
    expect(screen.getByTestId("metric-value")).toHaveTextContent("12.846");
  });
});

describe("SearchInput", () => {
  it("debounces input and supports clearing", async () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    render(<SearchInput label="Search" value="" onSearch={onSearch} debounce={200} />);
    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "ada" } });
    expect(onSearch).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(250); });
    expect(onSearch).toHaveBeenCalledWith("ada");
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(onSearch).toHaveBeenLastCalledWith("");
    vi.useRealTimers();
  });
  it("syncs from the external value", () => {
    const { rerender } = render(<SearchInput label="Search" value="a" onSearch={() => {}} />);
    rerender(<SearchInput label="Search" value="" onSearch={() => {}} />);
    expect(screen.getByLabelText("Search")).toHaveValue("");
  });
});

interface Row { id: string; name: string; amount: number }
const rows: Row[] = [{ id: "1", name: "Bravo", amount: 30 }, { id: "2", name: "Alpha", amount: 100 }, { id: "3", name: "Charlie", amount: 5 }];
const columns: Column<Row>[] = [
  { id: "name", header: "Name", sortValue: (r) => r.name, cell: (r) => r.name },
  { id: "amount", header: "Amount", sortValue: (r) => r.amount, cell: (r) => String(r.amount) },
];
const names = () => screen.getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell")[0].textContent);

describe("DataTable", () => {
  it("sorts client-side using real values (numeric not lexical)", async () => {
    const user = userEvent.setup();
    render(<DataTable caption="t" data={rows} columns={columns} getRowId={(r) => r.id} />);
    await user.click(screen.getByRole("button", { name: /Amount/ }));
    expect(names()).toEqual(["Charlie", "Bravo", "Alpha"]);
    await user.click(screen.getByRole("button", { name: /Amount/ }));
    expect(names()).toEqual(["Alpha", "Bravo", "Charlie"]);
    expect(screen.getByRole("columnheader", { name: /Amount/ })).toHaveAttribute("aria-sort", "descending");
  });
  it("delegates sorting in manual mode", async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    render(<DataTable caption="t" data={rows} columns={columns} getRowId={(r) => r.id} sort={{ id: "name", desc: false }} onSortChange={onSort} />);
    await user.click(screen.getByRole("button", { name: /Name/ }));
    expect(onSort).toHaveBeenCalledWith({ id: "name", desc: true });
  });
  it("selects all rows on the current page and reports partial state", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<DataTable caption="t" data={rows} columns={columns} getRowId={(r) => r.id} selection={{ selected: new Set(), onChange }} />);
    await user.click(screen.getByRole("checkbox", { name: "Select all rows on this page" }));
    expect(onChange).toHaveBeenCalledWith(new Set(["1", "2", "3"]));
    rerender(<DataTable caption="t" data={rows} columns={columns} getRowId={(r) => r.id} selection={{ selected: new Set(["1"]), onChange }} />);
    expect(screen.getByRole("checkbox", { name: "Select all rows on this page" })).toHaveAttribute("data-state", "indeterminate");
  });
  it("renders the empty state and opens rows via keyboard", async () => {
    const user = userEvent.setup();
    const onRow = vi.fn();
    const { rerender } = render(<DataTable caption="t" data={rows} columns={columns} getRowId={(r) => r.id} onRowClick={onRow} rowLabel={(r) => r.name} />);
    screen.getByRole("row", { name: "Open details for Alpha" }).focus();
    await user.keyboard("{Enter}");
    expect(onRow).toHaveBeenCalledWith(rows[1]);
    rerender(<DataTable caption="t" data={[]} columns={columns} getRowId={(r) => r.id} empty={<p>Nothing here</p>} />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });
  it("paginates", async () => {
    const user = userEvent.setup();
    const onPage = vi.fn();
    render(<DataTable caption="t" data={rows} columns={columns} getRowId={(r) => r.id} pagination={{ page: 2, pageCount: 3, total: 25, pageSize: 10, onPage }} />);
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPage).toHaveBeenCalledWith(3);
  });
});

describe("UrlFilters", () => {
  const filters = [{ param: "plan", label: "Plan", value: "Business", allLabel: "All plans", options: [{ value: "Business", label: "Business" }, { value: "Starter", label: "Starter" }] }];
  it("shows active chips, removes one and clears all via URL updates", async () => {
    search = "plan=Business&page=3";
    const user = userEvent.setup();
    render(<UrlFilters filters={filters} resetParams={["page"]} />);
    expect(screen.getByText("Plan: Business")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove filter Plan: Business" }));
    expect(push).toHaveBeenLastCalledWith("/dashboard", { scroll: false });
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(push).toHaveBeenLastCalledWith("/dashboard", { scroll: false });
  });
});

describe("LoginForm", () => {
  it("shows validation errors for empty and invalid input", async () => {
    const user = userEvent.setup();
    wrap(<LoginForm />);
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Email is required.")).toBeInTheDocument();
    expect(screen.getByText("Password is required.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    wrap(<LoginForm />);
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");
  });
  it("links to sign up and does not expose any demo shortcut", () => {
    wrap(<LoginForm />);
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/signup");
    expect(screen.queryByText(/demo/i)).not.toBeInTheDocument();
  });
  it("rejects an unknown account with a generic error", async () => {
    const user = userEvent.setup();
    wrap(<LoginForm />);
    await user.type(screen.getByLabelText("Email"), "nobody@example.com");
    await user.type(screen.getByLabelText("Password"), "whatever123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert", {}, { timeout: 4000 })).toHaveTextContent("Incorrect email or password.");
    expect(push).not.toHaveBeenCalled();
  });
  it("rejects a wrong password and accepts the right one for a registered account", async () => {
    await signUp({ name: "Ada Lovelace", email: "ada@analytical.com", password: "engine1842" });
    signOut();
    const user = userEvent.setup();
    wrap(<LoginForm />);
    await user.type(screen.getByLabelText("Email"), "ADA@analytical.com");
    await user.type(screen.getByLabelText("Password"), "wrong-pass1");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert", {}, { timeout: 4000 })).toHaveTextContent("Incorrect email or password.");
    await user.clear(screen.getByLabelText("Password"));
    await user.type(screen.getByLabelText("Password"), "engine1842");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"), { timeout: 4000 });
    expect(document.cookie).toContain("pulse-session=1");
    expect(preferencesStore.get().profile.displayName).toBe("Ada Lovelace");
  });
});

describe("SignupForm", () => {
  it("validates every field", async () => {
    const user = userEvent.setup();
    wrap(<SignupForm />);
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Enter your full name.")).toBeInTheDocument();
    expect(screen.getByText("Email is required.")).toBeInTheDocument();
    expect(screen.getByText("Password must be at least 8 characters.")).toBeInTheDocument();
    expect(screen.getByText("Confirm your password.")).toBeInTheDocument();
    expect(screen.getByText("Please accept the terms to continue.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Password"), "onlyletters");
    await user.type(screen.getByLabelText("Confirm password"), "different1");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Password must include a number.")).toBeInTheDocument();
    expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
  it("creates an account, signs in and opens the dashboard", async () => {
    const user = userEvent.setup();
    wrap(<SignupForm />);
    await user.type(screen.getByLabelText("Full name"), "Grace Hopper");
    await user.type(screen.getByLabelText("Work email"), "grace@navy.example");
    await user.type(screen.getByLabelText(/Workspace name/), "Compiler Co");
    await user.type(screen.getByLabelText("Password"), "cobol1959");
    await user.type(screen.getByLabelText("Confirm password"), "cobol1959");
    await user.click(screen.getByRole("checkbox", { name: "Accept the terms" }));
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"), { timeout: 4000 });
    expect(getCurrentAccount()).toMatchObject({ name: "Grace Hopper", email: "grace@navy.example", workspace: "Compiler Co" });
    expect(preferencesStore.get().workspaceName).toBe("Compiler Co");
    expect(document.cookie).toContain("pulse-session=1");
    const stored = JSON.parse(window.localStorage.getItem("pulse.accounts.v1")!)[0];
    expect(JSON.stringify(stored)).not.toContain("cobol1959");
  });
  it("rejects a duplicate email", async () => {
    await signUp({ name: "First User", email: "dupe@example.com", password: "password1" });
    const user = userEvent.setup();
    wrap(<SignupForm />);
    await user.type(screen.getByLabelText("Full name"), "Second User");
    await user.type(screen.getByLabelText("Work email"), "Dupe@Example.com");
    await user.type(screen.getByLabelText("Password"), "password2");
    await user.type(screen.getByLabelText("Confirm password"), "password2");
    await user.click(screen.getByRole("checkbox", { name: "Accept the terms" }));
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("An account with this email already exists.", {}, { timeout: 4000 })).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});

describe("ThemeToggle", () => {
  it("switches between light and dark and updates the document class", async () => {
    const user = userEvent.setup();
    wrap(<ThemeToggle />);
    const btn = await screen.findByRole("button", { name: "Switch to dark theme" });
    await user.click(btn);
    await waitFor(() => expect(document.documentElement).toHaveClass("dark"));
    await user.click(screen.getByRole("button", { name: "Switch to light theme" }));
    await waitFor(() => expect(document.documentElement).not.toHaveClass("dark"));
  });
});

describe("WidgetGate", () => {
  it("shows and hides widgets from preferences", () => {
    wrap(<WidgetGate id="topCustomers"><p>Top customers widget</p></WidgetGate>);
    expect(screen.getByText("Top customers widget")).toBeInTheDocument();
    act(() => { preferencesStore.set((p) => ({ ...p, widgets: { ...p.widgets, topCustomers: false } })); });
    expect(screen.queryByText("Top customers widget")).not.toBeInTheDocument();
    act(() => { preferencesStore.set((p) => ({ ...p, widgets: { ...DEFAULT_PREFERENCES.widgets } })); });
    expect(screen.getByText("Top customers widget")).toBeInTheDocument();
  });
  it("persists widget visibility and tolerates malformed storage", () => {
    preferencesStore.set((p) => ({ ...p, widgets: { ...p.widgets, breakdown: false } }));
    expect(JSON.parse(window.localStorage.getItem("pulse.preferences.v1")!).widgets.breakdown).toBe(false);
  });
});
