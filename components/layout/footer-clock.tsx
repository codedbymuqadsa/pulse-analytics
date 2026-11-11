"use client";

import { useEffect, useState } from "react";
import { useMounted } from "@/hooks/use-mounted";
import { usePreferences } from "@/lib/stores";

/** Local time in the time zone chosen in Settings. */
export function FooterClock() {
  const mounted = useMounted();
  const { timeZone, locale } = usePreferences();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  if (!mounted) return null;
  let text = "";
  try {
    text = new Intl.DateTimeFormat(locale, { timeZone, hour: "2-digit", minute: "2-digit", timeZoneName: "short" }).format(now);
  } catch {
    return null;
  }
  return <span> · Time zone: {timeZone} ({text})</span>;
}
