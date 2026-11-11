import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="The page you are looking for does not exist or may have moved."
        action={<Button asChild variant="primary"><Link href="/dashboard">Back to dashboard</Link></Button>}
      />
    </main>
  );
}
