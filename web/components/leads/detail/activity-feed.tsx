"use client";

import { useState } from "react";
import { Phone, StickyNote, UserRound, RefreshCw, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/leads/status-badge";
import { ActionFeedback } from "@/components/ui/action-feedback";
import { useActionStatus } from "@/lib/hooks/use-action-status";
import {
  addNote,
  addTask,
  completeTask,
  updateCallOutcome,
  type ActivityWithNames,
} from "@/lib/actions/activities";
import { formatRelativeTime } from "@/lib/utils";

const CALL_OUTCOMES = [
  "No Answer",
  "Left Voicemail",
  "Interested",
  "Not Interested",
  "Call Back Later",
  "Wrong Number",
];

type Tab = "all" | "notes" | "calls" | "tasks";

export function ActivityFeed({
  leadId,
  activities,
  activeTab,
  onTabChange,
  canEdit,
}: {
  leadId: string;
  activities: ActivityWithNames[];
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  canEdit: boolean;
}) {
  const filtered = activities.filter((a) => {
    if (activeTab === "all") return true;
    if (activeTab === "notes") return a.type === "note";
    if (activeTab === "calls") return a.type === "call";
    return a.type === "task";
  });

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as Tab)}>
        <TabsList>
          <TabsTrigger value="all" className="data-active:!bg-primary data-active:!text-primary-foreground">
            All Activities
          </TabsTrigger>
          <TabsTrigger value="notes" className="data-active:!bg-primary data-active:!text-primary-foreground">
            Notes
          </TabsTrigger>
          <TabsTrigger value="calls" className="data-active:!bg-primary data-active:!text-primary-foreground">
            Calls
          </TabsTrigger>
          <TabsTrigger value="tasks" className="data-active:!bg-primary data-active:!text-primary-foreground">
            Tasks
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {canEdit &&
        (activeTab === "tasks" ? (
          <TaskComposer leadId={leadId} />
        ) : activeTab !== "calls" ? (
          <NoteComposer leadId={leadId} />
        ) : null)}

      <div className="flex flex-col gap-3">
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Nothing here yet.</p>
        )}
        {filtered.map((activity) => (
          <ActivityItem key={activity.id} leadId={leadId} activity={activity} canEdit={canEdit} />
        ))}
      </div>
    </div>
  );
}

function NoteComposer({ leadId }: { leadId: string }) {
  const [body, setBody] = useState("");
  const { status, isPending, run } = useActionStatus();

  function handleSave() {
    if (!body.trim()) return;
    run(async () => {
      await addNote(leadId, body);
      setBody("");
    }, "Note added");
  }

  return (
    <div className="flex flex-col gap-1 rounded-lg border p-3">
      <div className="flex gap-2">
        <textarea
          className="min-h-16 flex-1 resize-none rounded-md border-0 bg-transparent text-sm outline-none"
          placeholder="Log a note, call outcome, or activity..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Button size="sm" disabled={isPending || !body.trim()} onClick={handleSave}>
          Save
        </Button>
      </div>
      <ActionFeedback status={status} />
    </div>
  );
}

function TaskComposer({ leadId }: { leadId: string }) {
  const [body, setBody] = useState("");
  const [dueDate, setDueDate] = useState("");
  const { status, isPending, run } = useActionStatus();

  function handleAdd() {
    if (!body.trim()) return;
    run(async () => {
      await addTask(leadId, body, dueDate);
      setBody("");
      setDueDate("");
    }, "Task added");
  }

  return (
    <div className="flex flex-col gap-1 rounded-lg border p-3">
      <div className="flex gap-2">
        <Input
          placeholder="New task..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Input
          type="date"
          className="w-40"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <Button size="sm" disabled={isPending || !body.trim()} onClick={handleAdd}>
          Add Task
        </Button>
      </div>
      <ActionFeedback status={status} />
    </div>
  );
}

function ActivityItem({
  leadId,
  activity,
  canEdit,
}: {
  leadId: string;
  activity: ActivityWithNames;
  canEdit: boolean;
}) {
  const author = activity.created_by_user?.name ?? "Someone";
  const when = formatRelativeTime(activity.created_at);

  if (activity.type === "assigned") {
    return (
      <ActivityShell icon={<UserRound className="size-4" />} title="Lead Assigned" author={author} when={when}>
        Assigned to {activity.new_assigned_to_user?.name ?? "Unassigned"}
      </ActivityShell>
    );
  }

  if (activity.type === "status_changed") {
    return (
      <ActivityShell icon={<RefreshCw className="size-4" />} title="Status Changed" author={author} when={when}>
        <div className="flex items-center gap-2">
          {activity.old_status && <StatusBadge status={activity.old_status} />}
          <span className="text-muted-foreground">→</span>
          {activity.new_status && <StatusBadge status={activity.new_status} />}
        </div>
      </ActivityShell>
    );
  }

  if (activity.type === "task") {
    return (
      <ActivityShell icon={<CheckSquare className="size-4" />} title="Task" author={author} when={when}>
        <TaskRow leadId={leadId} activity={activity} canEdit={canEdit} />
      </ActivityShell>
    );
  }

  if (activity.type === "call") {
    return (
      <ActivityShell icon={<Phone className="size-4" />} title="Call Logged" author={author} when={when}>
        <CallOutcomeEditor leadId={leadId} activity={activity} canEdit={canEdit} />
      </ActivityShell>
    );
  }

  return (
    <ActivityShell icon={<StickyNote className="size-4" />} title="Note" author={author} when={when}>
      {activity.body}
    </ActivityShell>
  );
}

function ActivityShell({
  icon,
  title,
  author,
  when,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  author: string;
  when: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-muted-foreground">{icon}</span>
          {title} <span className="font-normal text-muted-foreground">· {author}</span>
        </div>
        <span className="text-xs text-muted-foreground">{when}</span>
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function TaskRow({
  leadId,
  activity,
  canEdit,
}: {
  leadId: string;
  activity: ActivityWithNames;
  canEdit: boolean;
}) {
  const { isPending, run } = useActionStatus();
  const completed = !!activity.task_completed_at;

  function toggle() {
    run(() => completeTask(activity.id, leadId, !completed));
  }

  return (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={completed}
        disabled={isPending || !canEdit}
        onChange={toggle}
      />
      <span className={completed ? "text-muted-foreground line-through" : ""}>{activity.body}</span>
      {activity.task_due_date && (
        <span className="text-xs text-muted-foreground">due {activity.task_due_date}</span>
      )}
    </label>
  );
}

function CallOutcomeEditor({
  leadId,
  activity,
  canEdit,
}: {
  leadId: string;
  activity: ActivityWithNames;
  canEdit: boolean;
}) {
  const [outcome, setOutcome] = useState(activity.call_outcome ?? "");
  const [duration, setDuration] = useState(
    activity.call_duration_seconds ? Math.round(activity.call_duration_seconds / 60).toString() : "",
  );
  const [note, setNote] = useState(activity.body ?? "");
  const { status, isPending, run } = useActionStatus();

  function handleSave() {
    run(
      () =>
        updateCallOutcome(activity.id, leadId, {
          call_outcome: outcome || undefined,
          call_duration_seconds: duration ? Number(duration) * 60 : undefined,
          body: note,
        }),
      "Call outcome saved",
    );
  }

  if (!canEdit) {
    return (
      <div className="flex flex-col gap-1 text-sm">
        <div>{outcome || "No outcome recorded"}</div>
        {note && <div className="text-muted-foreground">{note}</div>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Select value={outcome || undefined} onValueChange={(v) => setOutcome(v ?? "")}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Set outcome..." />
          </SelectTrigger>
          <SelectContent>
            {CALL_OUTCOMES.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="number"
          min={0}
          placeholder="Minutes"
          className="w-28"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />
      </div>
      <textarea
        className="min-h-14 resize-none rounded-md border bg-transparent p-2 text-sm outline-none"
        placeholder="Add a note for this call..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex items-center justify-end gap-2">
        <ActionFeedback status={status} />
        <Button size="sm" disabled={isPending} onClick={handleSave}>
          Save
        </Button>
      </div>
    </div>
  );
}
