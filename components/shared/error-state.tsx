"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ErrorState({ title = "Something went wrong", description = "We could not load this content.", onRetry, className }: { title?: string; description?: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center gap-2 px-4 py-12 text-center", className)}>
      <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-danger-soft text-danger"><AlertTriangle className="size-5" aria-hidden /></div>
      <p className="font-semibold">{title}</p>
      <p className="max-w-sm text-[13px] text-muted">{description}</p>
      {onRetry && <Button size="sm" className="mt-2" onClick={onRetry}><RotateCw /> Try again</Button>}
    </div>
  );
}
