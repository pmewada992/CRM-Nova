import type { ActionStatus } from "@/lib/hooks/use-action-status";

export function ActionFeedback({ status }: { status: ActionStatus }) {
  if (status.state === "success") {
    return <p className="text-xs text-green-700">{status.message}</p>;
  }
  if (status.state === "error") {
    return <p className="text-xs text-red-600">{status.message}</p>;
  }
  return null;
}
