"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkmark } from "@/components/ui/controls";
import { Field, Input } from "@/components/ui/form";
import { signUp } from "@/lib/auth";
import { signupSchema, type SignupValues } from "@/lib/validations";

export function SignupForm() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, setValue, setError, watch, formState: { errors, isSubmitting } } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", workspace: "", password: "", confirmPassword: "", terms: false },
  });
  const terms = watch("terms");

  async function onSubmit(v: SignupValues) {
    setFormError(null);
    const res = await signUp({ name: v.name, email: v.email, password: v.password, workspace: v.workspace });
    if (!res.ok) {
      if (/already exists/.test(res.error)) setError("email", { message: res.error });
      else setFormError(res.error);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="mt-8 space-y-5">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {formError && <p role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger">{formError}</p>}
        <Field label="Full name" htmlFor="name" error={errors.name?.message}>
          <Input id="name" autoComplete="name" aria-invalid={Boolean(errors.name)} aria-describedby="name-msg" {...register("name")} />
        </Field>
        <Field label="Work email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" aria-invalid={Boolean(errors.email)} aria-describedby="email-msg" {...register("email")} />
        </Field>
        <Field label="Workspace name (optional)" htmlFor="workspace" error={errors.workspace?.message}>
          <Input id="workspace" placeholder="Your company" aria-invalid={Boolean(errors.workspace)} aria-describedby="workspace-msg" {...register("workspace")} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message} hint="At least 8 characters, with a letter and a number.">
          <div className="relative">
            <Input id="password" type={show ? "text" : "password"} autoComplete="new-password" className="pr-10" aria-invalid={Boolean(errors.password)} aria-describedby="password-msg" {...register("password")} />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground">
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        <Field label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
          <Input id="confirmPassword" type={show ? "text" : "password"} autoComplete="new-password" aria-invalid={Boolean(errors.confirmPassword)} aria-describedby="confirmPassword-msg" {...register("confirmPassword")} />
        </Field>
        <div>
          <label className="flex cursor-pointer items-start gap-2 text-[13px]">
            <Checkmark className="mt-0.5" checked={terms} onCheckedChange={(v) => setValue("terms", v === true, { shouldValidate: true })} aria-label="Accept the terms" aria-invalid={Boolean(errors.terms)} />
            <span>I agree to the Terms of Service and Privacy Policy.</span>
          </label>
          {errors.terms && <p role="alert" className="mt-1 text-xs font-medium text-danger">{errors.terms.message}</p>}
        </div>
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />} Create account
        </Button>
      </form>
      <p className="text-center text-sm text-muted">
        Already have an account? <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
