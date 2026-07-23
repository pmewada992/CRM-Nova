"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RouteError({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <AlertTriangle className="size-8 text-muted-foreground" />
      <div>
        <p className="font-medium">Something went wrong.</p>
        <p className="text-sm text-muted-foreground">Give it another try.</p>
      </div>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
