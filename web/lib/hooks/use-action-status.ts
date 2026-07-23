"use client";

import { useState, useTransition } from "react";

export type ActionStatus =
  | { state: "idle" }
  | { state: "pending" }
  | { state: "success"; message: string }
  | { state: "error"; message: string };

/**
 * Server Actions cross the client/server boundary as plain `Error`s — a
 * thrown `PermissionError`/`ValidationError`'s class doesn't survive
 * serialization, only `.message` does (and importing `lib/permissions.ts`,
 * which is `server-only`, into client code fails the build outright). So
 * the safe/unsafe split happens server-side instead: every Server Action
 * in `lib/actions/*` throws a deliberately human-readable message for
 * intentional cases and a fixed "Something went wrong." for raw
 * Supabase/Postgres errors — this just forwards whatever message arrives.
 */
export function friendlyMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong.";
}

/**
 * Wraps a Server Action call with pending/success/error state for inline
 * feedback under the triggering button — green success text, red (but
 * friendly) error text. Success auto-clears after a few seconds.
 */
export function useActionStatus() {
  const [status, setStatus] = useState<ActionStatus>({ state: "idle" });
  const [isPending, startTransition] = useTransition();

  function run(fn: () => Promise<void>, successMessage = "Saved") {
    setStatus({ state: "pending" });
    startTransition(async () => {
      try {
        await fn();
        setStatus({ state: "success", message: successMessage });
        setTimeout(() => setStatus((s) => (s.state === "success" ? { state: "idle" } : s)), 3000);
      } catch (err) {
        setStatus({ state: "error", message: friendlyMessage(err) });
      }
    });
  }

  return { status, isPending, run };
}
