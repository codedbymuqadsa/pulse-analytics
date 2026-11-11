import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsForm } from "@/components/settings/settings-form";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Workspace, appearance, dashboard and profile preferences." />
      <SettingsForm />
    </>
  );
}
