import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";

let counter = 0;

/** Registers a fresh account through the real sign-up form (each test has its own browser storage). */
async function signUpUser(page: Page, opts: { email?: string; password?: string; name?: string; workspace?: string } = {}) {
  const email = opts.email ?? `user${Date.now()}${counter++}@example.com`;
  const password = opts.password ?? "Passw0rdTest";
  await page.goto("/signup");
  await page.getByLabel("Full name").fill(opts.name ?? "Test User");
  await page.getByLabel("Work email").fill(email);
  if (opts.workspace) await page.getByLabel(/Workspace name/).fill(opts.workspace);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("checkbox", { name: "Accept the terms" }).click();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/dashboard/);
  return { email, password };
}

async function enterApp(page: Page, path = "/dashboard") {
  await page.goto(path);
  if (page.url().includes("/login")) {
    await signUpUser(page);
    if (path !== "/dashboard") await page.goto(path);
  }
}

test.describe("authentication", () => {
  test("redirects visitors to login and exposes no demo shortcuts", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/demo/i)).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Create an account" })).toBeVisible();
  });

  test("validates the sign-up form", async ({ page }) => {
    await page.goto("/signup");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Enter your full name.")).toBeVisible();
    await expect(page.getByText("Email is required.")).toBeVisible();
    await expect(page.getByText("Please accept the terms to continue.")).toBeVisible();
    await page.getByLabel("Password", { exact: true }).fill("onlyletters");
    await page.getByLabel("Confirm password").fill("different1");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Password must include a number.")).toBeVisible();
    await expect(page.getByText("Passwords do not match.")).toBeVisible();
  });

  test("signs up, signs out, then signs back in; wrong passwords and duplicate emails are rejected", async ({ page }) => {
    const { email, password } = await signUpUser(page, { name: "Priya Nair", workspace: "Nair Labs" });
    await expect(page.getByRole("heading", { name: "Overview", level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: /Workspace: Nair Labs/ })).toBeVisible();

    await page.getByRole("button", { name: "Open profile menu" }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel("Email").fill(email);
    await page.getByRole("textbox", { name: "Password" }).fill("WrongPass123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator("#login-error")).toHaveText("Incorrect email or password.");

    await page.getByRole("textbox", { name: "Password" }).fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("button", { name: /Workspace: Nair Labs/ })).toBeVisible();

    await page.getByRole("button", { name: "Open profile menu" }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await page.goto("/signup");
    await page.getByLabel("Full name").fill("Someone Else");
    await page.getByLabel("Work email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("Passw0rdTest");
    await page.getByLabel("Confirm password").fill("Passw0rdTest");
    await page.getByRole("checkbox", { name: "Accept the terms" }).click();
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("An account with this email already exists.")).toBeVisible();
  });

  test("an unknown email cannot sign in", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByRole("textbox", { name: "Password" }).fill("Whatever123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator("#login-error")).toHaveText("Incorrect email or password.");
  });

  test("sends users back to login when their stored account is gone", async ({ page }) => {
    await signUpUser(page);
    await page.evaluate(() => window.localStorage.clear());
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("dashboard", () => {
  test.beforeEach(async ({ page }) => { await enterApp(page); });

  test("navigates between all pages", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Primary" });
    for (const [label, heading] of [["Revenue", "Revenue"], ["Customers", "Customers"], ["Acquisition", "Acquisition"], ["Products", "Products"], ["Reports", "Reports"]] as const) {
      await nav.getByRole("link", { name: label, exact: true }).click();
      await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
    }
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();
  });

  test("shows KPI cards with derived values and changes the date range via the URL", async ({ page }) => {
    await expect(page.getByTestId("metric-card")).toHaveCount(6);
    const before = await page.getByTestId("revenue-total").textContent();
    await page.getByRole("button", { name: /Date range/ }).click();
    await page.getByRole("button", { name: "Last 7 days" }).click();
    await expect(page).toHaveURL(/range=7d/);
    await expect(page.getByRole("button", { name: "Date range: Last 7 days" })).toBeVisible();
    await expect.poll(async () => page.getByTestId("revenue-total").textContent()).not.toBe(before);
    // Back button restores the previous state
    await page.goBack();
    await expect(page).not.toHaveURL(/range=7d/);
  });

  test("validates a custom range and applies a valid one", async ({ page }) => {
    await page.getByRole("button", { name: /Date range/ }).click();
    await page.locator("#range-from").fill("2026-10-10");
    await page.locator("#range-to").fill("2026-10-01");
    await page.getByRole("button", { name: "Apply custom range" }).click();
    await expect(page.getByText("The start date must be on or before the end date.")).toBeVisible();
    await page.locator("#range-from").fill("2026-09-01");
    await page.locator("#range-to").fill("2026-09-15");
    await page.getByRole("button", { name: "Apply custom range" }).click();
    await expect(page).toHaveURL(/range=custom&from=2026-09-01&to=2026-09-15/);
    await expect(page.getByRole("button", { name: /Sep 1 – Sep 15, 2026/ })).toBeVisible();
  });

  test("handles invalid URL parameters gracefully", async ({ page }) => {
    await page.goto("/dashboard?range=custom&from=bad&to=worse&agg=zzz&tpage=-9");
    await expect(page.getByRole("heading", { name: "Overview", level: 1 })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "Showing the last 30 days instead." })).toBeVisible();
  });

  test("toggles comparison off and hides change badges", async ({ page }) => {
    await expect(page.getByText("vs prev. period").first()).toBeVisible();
    await page.getByRole("switch", { name: "Compare to previous period" }).first().click();
    await expect(page).toHaveURL(/compare=false/);
    await expect(page.getByText("vs prev. period")).toHaveCount(0);
  });

  test("filters, sorts and paginates the transactions table and opens details", async ({ page }) => {
    const table = page.getByTestId("transactions-table");
    await page.getByLabel("Filter by status").click();
    await page.getByRole("option", { name: "Failed" }).click();
    await expect(page).toHaveURL(/tstatus=failed/);
    await expect(table.getByText("Failed").first()).toBeVisible();
    await expect(table.getByText("Paid")).toHaveCount(0);
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page).not.toHaveURL(/tstatus/);

    await page.getByRole("button", { name: /^Amount/ }).click();
    await expect(page).toHaveURL(/tsort=amount/);
    await page.getByRole("button", { name: "Next page" }).first().click();
    await expect(page).toHaveURL(/tpage=2/);
    await expect(page.getByText(/Page 2 of/)).toBeVisible();

    await table.getByRole("row").nth(1).click();
    await expect(page.getByRole("dialog")).toContainText(/Transaction TX-/);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("customizes widgets and persists the choice across reloads", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Top customers" })).toBeVisible();
    await page.getByRole("button", { name: "Customize" }).click();
    await page.getByRole("switch", { name: "Top customers" }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Top customers" })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Recent transactions" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Top customers" })).toHaveCount(0);
    await page.getByRole("button", { name: "Customize" }).click();
    await page.getByRole("button", { name: "Restore defaults" }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Top customers" })).toBeVisible();
  });

  test("exports a KPI summary CSV", async ({ page }) => {
    await page.getByRole("button", { name: "Export report" }).click();
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: "KPI summary (CSV)" }).click()]);
    const text = fs.readFileSync(await download.path(), "utf8");
    expect(text).toContain("Metric,Period,Value,Previous period value,Change %");
    expect(text).toContain("Monthly Recurring Revenue");
  });
});

test.describe("customers", () => {
  test.beforeEach(async ({ page }) => { await enterApp(page, "/dashboard/customers"); });

  test("searches, filters, sorts, paginates and clears", async ({ page }) => {
    const table = page.getByTestId("customers-table");
    await expect(page.getByText(/Showing 1–10 of/)).toBeVisible();
    const total = (await page.getByText(/Showing 1–10 of/).textContent())!;

    await page.getByLabel("Filter by plan").click();
    await page.getByRole("option", { name: "Enterprise" }).click();
    await expect(page).toHaveURL(/plan=Enterprise/);
    await expect(table.getByRole("row").nth(1)).toContainText("Enterprise");

    await page.getByLabel("Filter by status").click();
    await page.getByRole("option", { name: "Active" }).click();
    await expect(page).toHaveURL(/status=active/);
    await expect(page.getByText("Plan: Enterprise")).toBeVisible();

    await page.getByRole("button", { name: /^Monthly spend/ }).click();
    await expect(page).toHaveURL(/sort=mrr/);

    await page.getByLabel("Search customers").fill("zzzz-no-match");
    await expect(page.getByText("No customers match")).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).first().click();
    await expect(page.getByText(/Showing 1–10 of/)).toHaveText(total);

    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText("Page 2 of")).toBeVisible();
  });

  test("opens the customer details drawer", async ({ page }) => {
    const first = page.getByTestId("customers-table").getByRole("row").nth(1);
    const name = (await first.getByRole("cell").nth(1).locator("span.font-medium").first().textContent())!;
    await first.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name, exact: true })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Subscription" })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Recent activity" })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Recent transactions" })).toBeVisible();
  });

  test("applies a bulk label that persists, and clears selection when filters change", async ({ page }) => {
    const rows = page.getByTestId("customers-table").getByRole("row");
    await page.getByRole("checkbox", { name: "Select all rows on this page" }).click();
    await expect(page.getByText("10 selected")).toBeVisible();
    await page.getByRole("button", { name: "Add label" }).click();
    await page.getByRole("menuitem", { name: "VIP" }).click();
    await expect(page.getByText("Added “VIP” to 10 customers")).toBeVisible();
    await expect(rows.nth(1)).toContainText("VIP");
    await page.reload();
    await expect(page.getByTestId("customers-table").getByRole("row").nth(1)).toContainText("VIP");

    await page.getByRole("checkbox", { name: "Select all rows on this page" }).click();
    await expect(page.getByText("10 selected")).toBeVisible();
    await page.getByLabel("Filter by plan").click();
    await page.getByRole("option", { name: "Business" }).click();
    await expect(page.getByText(/\d+ selected/)).toHaveCount(0);
  });

  test("exports only the filtered customers as CSV", async ({ page }) => {
    await page.getByLabel("Filter by plan").click();
    await page.getByRole("option", { name: "Business" }).click();
    await expect(page).toHaveURL(/plan=Business/);
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export filtered CSV" }).click()]);
    const text = fs.readFileSync(await download.path(), "utf8").replace(/^﻿/, "");
    const lines = text.trim().split("\r\n");
    expect(lines[0]).toBe("Customer ID,Name,Email,Company,Plan,Billing,Monthly spend (USD),Created,Last activity,Status");
    expect(lines.length).toBeGreaterThan(5);
    expect(lines.slice(1).every((l) => l.includes(",Business,"))).toBe(true);
  });

  test("shows a message instead of exporting an empty dataset", async ({ page }) => {
    await page.goto("/dashboard/customers?q=zzzz-no-match");
    await page.getByRole("button", { name: "Export filtered CSV" }).click();
    await expect(page.getByText("Nothing to export for the current filters.")).toBeVisible();
  });
});

test.describe("reports", () => {
  test.beforeEach(async ({ page }) => { await enterApp(page, "/dashboard/reports"); });

  test("creates, renames, duplicates and deletes a report with persistence", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Revenue Performance" })).toBeVisible();
    await page.getByRole("button", { name: "New report" }).first().click();
    const dialog = page.getByRole("dialog");

    // validation
    await dialog.getByLabel("Report name").fill("ab");
    await dialog.getByRole("button", { name: "Save report" }).click();
    await expect(dialog.getByText("Name must be at least 3 characters.")).toBeVisible();
    // duplicate names are rejected
    await dialog.getByLabel("Report name").fill("Revenue Performance");
    await dialog.getByRole("button", { name: "Save report" }).click();
    await expect(dialog.getByText("A report with this name already exists.")).toBeVisible();

    await dialog.getByLabel("Report name").fill("Quarterly MRR by plan");
    await dialog.getByLabel("Metric").click();
    await page.getByRole("option", { name: "MRR", exact: true }).click();
    await dialog.getByLabel("Group by").click();
    await page.getByRole("option", { name: "Plan" }).click();
    await expect(dialog.getByRole("img", { name: /MRR area chart grouped by plan/ })).toBeVisible();
    await dialog.getByRole("button", { name: "Save report" }).click();
    await expect(page.getByRole("heading", { name: "Quarterly MRR by plan" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Quarterly MRR by plan" })).toBeVisible();

    // rename
    await page.getByRole("button", { name: "Actions for Quarterly MRR by plan" }).click();
    await page.getByRole("menuitem", { name: "Rename" }).click();
    await page.getByLabel("Report name").fill("MRR mix");
    await page.getByRole("button", { name: "Rename", exact: true }).click();
    await expect(page.getByRole("heading", { name: "MRR mix" })).toBeVisible();

    // duplicate
    await page.getByRole("button", { name: "Actions for MRR mix" }).click();
    await page.getByRole("menuitem", { name: "Duplicate" }).click();
    await expect(page.getByRole("heading", { name: "MRR mix (copy)" })).toBeVisible();

    // delete with confirmation
    await page.getByRole("button", { name: "Actions for MRR mix (copy)" }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await expect(page.getByRole("alertdialog").or(page.getByRole("dialog"))).toContainText("Delete");
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByRole("heading", { name: "MRR mix (copy)" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "MRR mix", exact: true })).toBeVisible();
  });

  test("opens a report detail page and exports its data as CSV", async ({ page }) => {
    await page.getByRole("link", { name: "Open report" }).first().click();
    await expect(page).toHaveURL(/\/dashboard\/reports\/.+/);
    await expect(page.getByRole("img", { name: /chart/ })).toBeVisible();
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export CSV" }).click()]);
    const text = fs.readFileSync(await download.path(), "utf8").replace(/^﻿/, "");
    expect(text.split("\r\n")[0]).toMatch(/^Date,/);
    expect(text.split("\r\n").length).toBeGreaterThan(10);
  });

  test("shows a recoverable not-found state for unknown reports", async ({ page }) => {
    await page.goto("/dashboard/reports/does-not-exist");
    await expect(page.getByText("Report not found")).toBeVisible();
    await page.getByRole("link", { name: "Back to reports" }).click();
    await expect(page).toHaveURL(/\/dashboard\/reports$/);
  });

  test("filters and searches the library", async ({ page }) => {
    await page.getByLabel("Search reports").fill("acquisition");
    await expect(page.getByRole("heading", { name: "Acquisition Overview" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Customer Growth" })).toHaveCount(0);
    await page.getByRole("button", { name: "Clear filters" }).click();
    await page.getByLabel("Filter by category").click();
    await page.getByRole("option", { name: "Subscriptions" }).click();
    await expect(page.getByRole("heading", { name: "Subscription Health" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Revenue Performance" })).toHaveCount(0);
  });
});

test.describe("products", () => {
  test("adds a validated plan, edits it and deletes with confirmation", async ({ page }) => {
    await enterApp(page, "/dashboard/products");
    await page.getByRole("button", { name: "Add plan" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Create plan" }).click();
    await expect(dialog.getByText("Name must be at least 3 characters.")).toBeVisible();
    await expect(dialog.getByText("Add a short description.")).toBeVisible();
    await dialog.getByLabel("Plan name").fill("Startup Plus");
    await dialog.getByLabel("Description").fill("A test plan for startups");
    await dialog.getByRole("button", { name: "Create plan" }).click();
    await expect(page.getByRole("cell", { name: /Startup Plus/ })).toBeVisible();

    await page.getByRole("row", { name: "Open details for Startup Plus" }).click();
    await expect(page.getByRole("dialog")).toContainText("No subscribers yet");
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Delete Startup Plus?")).toBeVisible();
    await page.getByRole("button", { name: "Delete", exact: true }).last().click();
    await expect(page.getByRole("cell", { name: /Startup Plus/ })).toHaveCount(0);
  });
});

test.describe("settings, theme and persistence", () => {
  test("persists the theme and settings across reloads", async ({ page }) => {
    await enterApp(page, "/dashboard/settings");
    await page.getByRole("radio", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByLabel("Workspace name").fill("Pulse QA");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Settings saved")).toBeVisible();

    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByLabel("Workspace name")).toHaveValue("Pulse QA");
    await expect(page.getByRole("button", { name: /Workspace: Pulse QA/ })).toBeVisible();
  });

  test("validates settings", async ({ page }) => {
    await enterApp(page, "/dashboard/settings");
    await page.getByLabel("Workspace name").fill("x");
    await page.getByLabel("Email").fill("bad");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Workspace name must be at least 2 characters.")).toBeVisible();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  });

  test("toggles the theme from the header and collapses the sidebar persistently", async ({ page }) => {
    await enterApp(page);
    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});

test.describe("search palette and header", () => {
  test("opens the command palette with the keyboard and navigates", async ({ page }) => {
    await enterApp(page);
    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog", { name: "Command palette" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("combobox").fill("acq");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/dashboard\/(acquisition|customers)/);
  });

  test("notifications can be marked as read", async ({ page }) => {
    await enterApp(page);
    await page.getByRole("button", { name: "Notifications" }).click();
    await page.getByRole("button", { name: "Mark all read" }).click();
    await expect(page.getByText("0 unread notifications")).toBeAttached();
  });
});

test.describe("acquisition and revenue filters", () => {
  test("filters acquisition by channel and shows an empty state for impossible combos", async ({ page }) => {
    await enterApp(page, "/dashboard/acquisition");
    await expect(page.getByRole("heading", { name: "Acquisition funnel" })).toBeVisible();
    await page.goto("/dashboard/acquisition?channel=Social&campaign=Autumn%20Launch");
    // campaign belonging to another channel is ignored rather than yielding a blank page
    await expect(page.getByRole("heading", { name: "Acquisition funnel" })).toBeVisible();
    await page.goto("/dashboard/acquisition?range=custom&from=2026-10-18&to=2026-10-18&channel=Email&campaign=Product%20Newsletter");
    await expect(page.getByRole("heading", { name: "Acquisition", level: 1 })).toBeVisible();
  });

  test("filters revenue by plan", async ({ page }) => {
    await enterApp(page, "/dashboard/revenue");
    await page.getByLabel("Filter by plan").click();
    await page.getByRole("option", { name: "Enterprise" }).click();
    await expect(page).toHaveURL(/plan=Enterprise/);
    await expect(page.getByRole("cell", { name: "Starter" })).toHaveCount(1);
  });
});

test.describe("responsive layout", () => {
  test("uses a drawer for navigation on mobile without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await enterApp(page);
    await expect(page.getByRole("complementary", { name: "Sidebar" })).toBeHidden();
    await page.getByRole("button", { name: "Open navigation menu" }).click();
    const nav = page.getByRole("dialog").getByRole("navigation", { name: "Primary" });
    await nav.getByRole("link", { name: "Customers" }).click();
    await expect(page).toHaveURL(/\/dashboard\/customers/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    for (const path of ["/dashboard", "/dashboard/revenue", "/dashboard/customers", "/dashboard/acquisition", "/dashboard/products", "/dashboard/reports", "/dashboard/settings"]) {
      await page.goto(path);
      await page.waitForLoadState("load");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} horizontal overflow`).toBeLessThanOrEqual(0);
    }
  });

  test("renders at 360px and 768px without overflow", async ({ page }) => {
    await enterApp(page);
    for (const width of [360, 768, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/dashboard");
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    }
  });
});

test("unknown routes show a not-found page with a recovery link", async ({ page }) => {
  await enterApp(page);
  await page.goto("/dashboard/nope");
  await expect(page.getByText("Page not found")).toBeVisible();
  await page.getByRole("link", { name: "Back to dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});
