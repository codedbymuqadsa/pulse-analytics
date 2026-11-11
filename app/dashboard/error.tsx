"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/error-state";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <ErrorState
      className="py-24"
      title="We couldn't load this page"
      description="Something went wrong while preparing your analytics. Try again, and if the problem continues, reload the page."
      onRetry={reset}
    />
  );
}
