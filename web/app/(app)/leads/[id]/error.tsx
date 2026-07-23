"use client";

import { RouteError } from "@/components/ui/route-error";

export default function LeadDetailError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError reset={reset} />;
}
