import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/signup-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthShell title="Create your account" subtitle="Set up your workspace in less than a minute.">
      <Suspense><SignupForm /></Suspense>
    </AuthShell>
  );
}
