"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTheme } from "next-themes";
import { Monitor, Moon, RotateCcw, Sun } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Toggle } from "@/components/ui/controls";
import { Field, Input, Label } from "@/components/ui/form";
import { Select } from "@/components/ui/select";
import { Avatar } from "@/components/shared/avatar";
import { useMounted } from "@/hooks/use-mounted";
import { DEFAULT_PREFERENCES, preferencesStore, usePreferences, WIDGETS } from "@/lib/stores";
import { updateCurrentAccount } from "@/lib/auth";
import { settingsSchema, type SettingsValues } from "@/lib/validations";
import { cn } from "@/lib/utils";

const TIME_ZONES = ["UTC", "America/New_York", "America/Chicago", "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Asia/Karachi", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney"];

function fromPrefs(p: typeof DEFAULT_PREFERENCES): SettingsValues {
  return {
    workspaceName: p.workspaceName, defaultRange: p.defaultRange, defaultCompare: p.defaultCompare, timeZone: p.timeZone, locale: p.locale,
    compactNumbers: p.compactNumbers, chartStyle: p.chartStyle, sidebarCollapsed: p.sidebarCollapsed, widgets: p.widgets,
    displayName: p.profile.displayName, email: p.profile.email, role: p.profile.role,
  };
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader><div><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></div></CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

function SwitchRow({ id, label, hint, checked, onChange }: { id: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div><Label htmlFor={id} className="cursor-pointer">{label}</Label>{hint && <p className="text-[13px] text-muted">{hint}</p>}</div>
      <Toggle id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function SettingsForm() {
  const mounted = useMounted();
  const saved = usePreferences();
  const { theme, setTheme } = useTheme();
  const { register, control, handleSubmit, reset, watch, setError, formState: { errors, isDirty, isSubmitting } } = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: fromPrefs(saved),
  });

  // Re-sync once browser storage has loaded (first render uses server defaults).
  useEffect(() => { if (mounted) reset(fromPrefs(preferencesStore.get())); }, [mounted, reset]);

  const displayName = watch("displayName");

  function onSubmit(v: SettingsValues) {
    const account = updateCurrentAccount({ name: v.displayName, email: v.email, workspace: v.workspaceName });
    if (!account.ok && /already uses/.test(account.error)) {
      setError("email", { message: account.error });
      return;
    }
    const ok = preferencesStore.set((p) => ({
      ...p, workspaceName: v.workspaceName, defaultRange: v.defaultRange, defaultCompare: v.defaultCompare, timeZone: v.timeZone, locale: v.locale,
      compactNumbers: v.compactNumbers, chartStyle: v.chartStyle, sidebarCollapsed: v.sidebarCollapsed, widgets: v.widgets,
      profile: { displayName: v.displayName, email: v.email, role: v.role },
    }));
    reset(v);
    if (ok) toast.success("Settings saved");
    else toast.error("Could not save: browser storage is unavailable. Changes apply until you reload.");
  }

  function resetDefaults() {
    preferencesStore.reset();
    reset(fromPrefs(DEFAULT_PREFERENCES));
    setTheme("light");
    toast.success("Settings reset to defaults");
  }

  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mx-auto max-w-3xl space-y-6 pb-24">
      <p className="rounded-md border border-info/30 bg-info-soft px-3 py-2 text-[13px] text-info">Settings are saved on this device and are not synced to other browsers or devices.</p>

      <Section title="General" description="Workspace and formatting preferences.">
        <Field label="Workspace name" htmlFor="workspaceName" error={errors.workspaceName?.message}>
          <Input id="workspaceName" aria-invalid={Boolean(errors.workspaceName)} aria-describedby="workspaceName-msg" {...register("workspaceName")} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Default date range" htmlFor="defaultRange" hint="Applied when you open a page without a range in the URL.">
            <Controller control={control} name="defaultRange" render={({ field }) => (
              <Select id="defaultRange" aria-describedby="defaultRange-msg" value={field.value} onValueChange={field.onChange} options={[{ value: "7d", label: "Last 7 days" }, { value: "30d", label: "Last 30 days" }, { value: "90d", label: "Last 90 days" }, { value: "mtd", label: "This month" }, { value: "lm", label: "Last month" }]} />
            )} />
          </Field>
          <Field label="Time zone" htmlFor="timeZone" hint="Used for the clock in the page footer.">
            <Controller control={control} name="timeZone" render={({ field }) => <Select id="timeZone" aria-describedby="timeZone-msg" value={field.value} onValueChange={field.onChange} options={TIME_ZONES.map((z) => ({ value: z, label: z }))} />} />
          </Field>
          <Field label="Number format" htmlFor="locale" hint="Example: 1,234.50 vs 1.234,50">
            <Controller control={control} name="locale" render={({ field }) => <Select id="locale" aria-describedby="locale-msg" value={field.value} onValueChange={field.onChange} options={[{ value: "en-US", label: "English (US)" }, { value: "en-GB", label: "English (UK)" }, { value: "de-DE", label: "Deutsch (DE)" }]} />} />
          </Field>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <p className="flex h-9 items-center rounded-md border bg-surface-muted px-3 text-sm text-muted">USD ($)</p>
            <p className="text-xs text-muted">All amounts are shown in US dollars.</p>
          </div>
        </div>
        <Controller control={control} name="compactNumbers" render={({ field }) => <SwitchRow id="compactNumbers" label="Compact large numbers" hint="Show 84.2K instead of 84,250 for values above 10,000." checked={field.value} onChange={field.onChange} />} />
      </Section>

      <Section title="Appearance" description="Theme applies immediately and is remembered on this device.">
        <fieldset>
          <legend className="mb-2 text-[13px] font-medium">Theme</legend>
          <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2">
            {themes.map((t) => {
              const Icon = t.icon;
              const active = mounted && theme === t.value;
              return (
                <button key={t.value} type="button" role="radio" aria-checked={active} onClick={() => setTheme(t.value)}
                  className={cn("flex flex-col items-center gap-1.5 rounded-md border p-3 text-sm font-medium transition-colors hover:bg-surface-muted", active && "border-primary bg-primary-soft text-primary")}>
                  <Icon className="size-5" aria-hidden />{t.label}
                </button>
              );
            })}
          </div>
        </fieldset>
        <Controller control={control} name="sidebarCollapsed" render={({ field }) => <SwitchRow id="sidebarCollapsed" label="Collapse sidebar by default" hint="You can also collapse it from the sidebar itself." checked={field.value} onChange={field.onChange} />} />
      </Section>

      <Section title="Dashboard" description="Defaults for the overview and charts.">
        <Controller control={control} name="defaultCompare" render={({ field }) => <SwitchRow id="defaultCompare" label="Compare to previous period by default" checked={field.value} onChange={field.onChange} />} />
        <Field label="Revenue chart style" htmlFor="chartStyle">
          <Controller control={control} name="chartStyle" render={({ field }) => <Select id="chartStyle" value={field.value} onValueChange={field.onChange} options={[{ value: "area", label: "Area" }, { value: "line", label: "Line" }]} />} />
        </Field>
        <fieldset className="space-y-3">
          <legend className="mb-1 text-[13px] font-medium">Visible widgets</legend>
          {WIDGETS.map((w) => (
            <Controller key={w.id} control={control} name={`widgets.${w.id}`} render={({ field }) => <SwitchRow id={`w-${w.id}`} label={w.label} hint={w.description} checked={field.value} onChange={field.onChange} />} />
          ))}
        </fieldset>
      </Section>

      <Section title="Profile" description="How you appear in the app. Stored locally.">
        <div className="flex items-center gap-4"><Avatar name={displayName || "?"} size="lg" /><p className="text-[13px] text-muted">Your avatar uses your initials.</p></div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Display name" htmlFor="displayName" error={errors.displayName?.message}>
            <Input id="displayName" aria-invalid={Boolean(errors.displayName)} aria-describedby="displayName-msg" {...register("displayName")} />
          </Field>
          <Field label="Role" htmlFor="role" error={errors.role?.message}>
            <Input id="role" aria-invalid={Boolean(errors.role)} aria-describedby="role-msg" {...register("role")} />
          </Field>
          <Field label="Email" htmlFor="email" error={errors.email?.message} className="sm:col-span-2">
            <Input id="email" type="email" aria-invalid={Boolean(errors.email)} aria-describedby="email-msg" {...register("email")} />
          </Field>
        </div>
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-surface/95 px-4 py-3 backdrop-blur lg:left-[250px]">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2">
          <Button onClick={resetDefaults}><RotateCcw /> Reset to defaults</Button>
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-muted" aria-live="polite">{isDirty ? "Unsaved changes" : "All changes saved"}</span>
            <Button disabled={!isDirty} onClick={() => reset(fromPrefs(saved))}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={!isDirty || isSubmitting}>Save changes</Button>
          </div>
        </div>
      </div>
    </form>
  );
}
