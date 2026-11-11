import { cn, initials } from "@/lib/utils";

const TONES = ["bg-primary-soft text-primary", "bg-success-soft text-success", "bg-info-soft text-info", "bg-warning-soft text-warning", "bg-danger-soft text-danger"];

export function Avatar({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const tone = TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length];
  return (
    <span aria-hidden className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold", tone, size === "sm" ? "size-7 text-[11px]" : size === "lg" ? "size-14 text-lg" : "size-9 text-xs", className)}>
      {initials(name)}
    </span>
  );
}
