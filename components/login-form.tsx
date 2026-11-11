"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Checkmark } from "@/components/ui/controls";
import { signIn } from "@/lib/auth";
import { loginSchema, type LoginValues } from "@/lib/validations";

export function safeNext(next: string | null): string {
  return next && next.startsWith("/dashboard") ? next : "/dashboard";
}

export function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [show, setShow] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: true },
  });
  const remember = watch("remember");

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    const res = await signIn(values.email, values.password, values.remember);
    if (!res.ok) {
      setFormError(res.error);
      return;
    }
    router.push(safeNext(sp.get("next")));
  }

  return (
    <div className="mt-8 space-y-5">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4" aria-describedby={formError ? "login-error" : undefined}>
        {formError && <p id="login-error" role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger">{formError}</p>}
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" aria-invalid={Boolean(errors.email)} aria-describedby="email-msg" {...register("email")} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <div className="relative">
            <Input id="password" type={show ? "text" : "password"} autoComplete="current-password" className="pr-10" aria-invalid={Boolean(errors.password)} aria-describedby="password-msg" {...register("password")} />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground">
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        <label className="flex cursor-pointer items-center gap-2 text-[13px]">
          <Checkmark checked={remember} onCheckedChange={(v) => setValue("remember", v === true)} aria-label="Remember me" />
          Remember me on this device
        </label>
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />} Sign in
        </Button>
      </form>
      <p className="text-center text-sm text-muted">
        New to Pulse Analytics? <Link href="/signup" className="font-semibold text-primary hover:underline">Create an account</Link>
      </p>
    </div>
  );
}
