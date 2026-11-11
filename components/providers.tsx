"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/controls";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem themes={["light", "dark"]} storageKey="pulse.theme">
      <TooltipProvider>{children}</TooltipProvider>
      <Toaster position="bottom-right" closeButton toastOptions={{ classNames: { toast: "!bg-surface !text-foreground !border-border" } }} />
    </ThemeProvider>
  );
}
