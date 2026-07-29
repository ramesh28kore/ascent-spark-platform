import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { upsertSession, deleteSession } from "@/lib/crt-ops.functions";
import { batchesQuery, meQuery, modulesQuery, sessionsQuery } from "@/lib/crt-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({
    meta: [
      { title: "Session schedule — CRT Training Console" },
      {
        name: "description",
        content: "Plan CRT training sessions per batch and module with trainer, timing and status.",
      },
      { property: "og:title", content: "Session schedule — CRT Training Console" },
      { property: "og:description", content: "Weekly CRT session planner for every batch." },
    ],
  }),
  component: SchedulePage,
});

const STATUSES = ["planned", "conducted", "cancelled"] as const;

function SchedulePage() {
  const me = useQuery(meQuery);
  const sessions = useQuery(sessionsQuery);
  const batches = useQuery(batchesQuery);
  const modules = useQuery(modulesQuery);
  const queryClient = useQueryClient();
  const save = useServerFn(upsertSession);
  const remove = useServerFn(deleteSession);

  const isStaff = !!me.data?.isStaff;
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [batchId, setBatchId] = useState("none");
  const [moduleId, setModuleId] = useState("none");
  const [trainer, setTrainer] = useState("");
  const [when, setWhen] = useState(new Date().toISOString().slice(0, 16));
  const [duration, setDuration] = useState("90");
  const [notes, setNotes] = useState("");

  const create = useMutation({
    mutationFn: () =>
      save({
        data: {
          batch_id: batchId === "none" ? null : batchId,
          module_id: moduleId === "none" ? null : moduleId,
          topic_id: null,
          trainer_name: trainer.trim() || null,
          title: title.trim(),
          scheduled_at: new Date(when).toISOString(),
          duration_min: Number(duration) || 90,
          status: "planned" as const,
          notes: notes.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success("Session scheduled");
      setOpen(false);
      setTitle("");
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: (vars: { id: string; status: (typeof STATUSES)[number] }) => {
      const s = (sessions.data ?? []).find((x) => x.id === vars.id)!;
      return save({
        data: {
          id: s.id,
          batch_id: s.batch_id,
          module_id: s.module_id,
          topic_id: s.topic_id,
          trainer_name: s.trainer_name,
          title: s.title,
          scheduled_at: s.scheduled_at,
          duration_min: s.duration_min,
          status: vars.status,
          notes: s.notes,
        },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sessions"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Session removed");
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const batchName = (id: string | null) =>
    (batches.data ?? []).find((b) => b.id === id)?.name ?? "All batches";
  const moduleCode = (id: string | null) =>
    (modules.data?.modules ?? []).find((m) => m.id === id)?.code ?? "—";

  const grouped = new Map<string, typeof sessions.data>();
  for (const s of sessions.data ?? []) {
    const day = new Date(s.scheduled_at).toISOString().slice(0, 10);
    grouped.set(day, [...(grouped.get(day) ?? []), s]);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Session schedule</h1>
          <p className="text-sm text-muted-foreground">
            Plan the weekly CRT calendar; attendance is captured against conducted sessions.
          </p>
        </div>
        {isStaff && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Schedule session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New session</DialogTitle>
                <DialogDescription>Timetable a training slot.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Batch</Label>
                  <Select value={batchId} onValueChange={setBatchId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">All batches</SelectItem>
                      {(batches.data ?? []).map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Module</Label>
                  <Select value={moduleId} onValueChange={setModuleId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not linked</SelectItem>
                      {(modules.data?.modules ?? []).map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.code} — {m.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Starts at</Label>
                  <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Duration (min)</Label>
                  <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Trainer</Label>
                  <Input value={trainer} onChange={(e) => setTrainer(e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Notes</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => create.mutate()} disabled={create.isPending || title.trim().length < 3}>
                  Save session
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-4">
        {[...grouped.entries()].map(([day, items]) => (
          <Card key={day}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {new Date(day).toLocaleDateString(undefined, {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                })}
              </CardTitle>
              <CardDescription>{items?.length} session(s)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(items ?? []).map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.scheduled_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {s.duration_min} min · {moduleCode(s.module_id)} · {batchName(s.batch_id)}
                      {s.trainer_name ? ` · ${s.trainer_name}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isStaff ? (
                      <Select
                        value={s.status}
                        onValueChange={(v) =>
                          setStatus.mutate({ id: s.id, status: v as (typeof STATUSES)[number] })
                        }
                      >
                        <SelectTrigger className="h-8 w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((st) => (
                            <SelectItem key={st} value={st}>
                              {st}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary">{s.status}</Badge>
                    )}
                    {isStaff && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => del.mutate(s.id)}
                        aria-label="Delete session"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
        {sessions.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">No sessions scheduled yet.</p>
        )}
      </div>
    </div>
  );
}
