import { z } from "zod";
import { isIsoDate, validateCustomRange } from "@/lib/date-range";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  remember: z.boolean(),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name.").max(60, "Name must be 60 characters or fewer."),
    email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
    workspace: z.string().trim().max(40, "Workspace name must be 40 characters or fewer.").optional().or(z.literal("")),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(/[A-Za-z]/, "Password must include a letter.")
      .regex(/[0-9]/, "Password must include a number."),
    confirmPassword: z.string().min(1, "Confirm your password."),
    terms: z.boolean().refine((v) => v, "Please accept the terms to continue."),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });
export type SignupValues = z.infer<typeof signupSchema>;

export const reportSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters.").max(60, "Name must be 60 characters or fewer."),
  description: z.string().trim().max(200, "Keep the description under 200 characters."),
  category: z.enum(["Revenue", "Customers", "Acquisition", "Subscriptions"]),
  metric: z.enum(["revenue", "mrr", "newMrr", "churnedMrr", "newCustomers", "activeSubscriptions"]),
  chartType: z.enum(["line", "area", "bar"]),
  range: z.enum(["30d", "90d", "180d", "365d"]),
  groupBy: z.enum(["none", "plan", "billing", "channel"]),
});
export type ReportFormValues = z.infer<typeof reportSchema>;

export const renameSchema = z.object({
  name: reportSchema.shape.name,
});

export const planSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters.").max(40, "Name must be 40 characters or fewer."),
  tier: z.enum(["Starter", "Professional", "Business", "Enterprise"]),
  interval: z.enum(["monthly", "annual"]),
  price: z.number({ error: "Enter a price." }).positive("Price must be greater than 0.").max(100000, "Price must be below $100,000."),
  status: z.enum(["active", "draft", "archived"]),
  description: z.string().trim().min(5, "Add a short description.").max(200, "Keep the description under 200 characters."),
});
export type PlanFormValues = z.infer<typeof planSchema>;

export const settingsSchema = z.object({
  workspaceName: z.string().trim().min(2, "Workspace name must be at least 2 characters.").max(40, "Workspace name must be 40 characters or fewer."),
  defaultRange: z.enum(["7d", "30d", "90d", "mtd", "lm"]),
  defaultCompare: z.boolean(),
  timeZone: z.string().min(1),
  locale: z.enum(["en-US", "en-GB", "de-DE"]),
  compactNumbers: z.boolean(),
  chartStyle: z.enum(["area", "line"]),
  sidebarCollapsed: z.boolean(),
  widgets: z.object({ revenueChart: z.boolean(), breakdown: z.boolean(), customerGrowth: z.boolean(), transactions: z.boolean(), topCustomers: z.boolean() }),
  displayName: z.string().trim().min(2, "Display name must be at least 2 characters.").max(50),
  email: z.string().min(1, "Email is required.").email("Enter a valid email address."),
  role: z.string().trim().min(2, "Role is required.").max(40),
});
export type SettingsValues = z.infer<typeof settingsSchema>;

export const customRangeSchema = z
  .object({ from: z.string(), to: z.string() })
  .superRefine((v, ctx) => {
    if (!isIsoDate(v.from)) return ctx.addIssue({ code: "custom", path: ["from"], message: "Enter a valid start date." });
    if (!isIsoDate(v.to)) return ctx.addIssue({ code: "custom", path: ["to"], message: "Enter a valid end date." });
    const msg = validateCustomRange(v.from, v.to);
    if (msg) ctx.addIssue({ code: "custom", path: ["to"], message: msg });
  });

export const SEGMENT_LABELS = ["VIP", "At risk", "Needs follow-up", "Champion"] as const;
