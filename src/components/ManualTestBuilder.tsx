/**
 * Hand-pick questions from the bank and publish a timed paper with an exact
 * exam window (start → end). Complements the random auto-generator.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ListChecks } from "lucide-react";

import { createManualTest } from "@/lib/tests.functions";
import { batchesQuery, modulesQuery, questionsQuery } from "@/lib/crt-queries";
import { formatFormError } from "@/lib/form-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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

const localNow = (offsetMin = 0) =>
  new Date(Date.now() + offsetMin * 60_000 - new Date().getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);

export function ManualTestBuilder() {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createManualTest);
  const questions = useQuery(questionsQuery);
  const modules = useQuery(modulesQuery);
  const batches = useQuery(batchesQuery);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("MCQ exam");
  const [moduleId, setModuleId] = useState("none");
  const [batchId, setBatchId] = useState("none");
  const [filterModule, setFilterModule] = useState("all");
  const [search, setSearch] = useState("");
  const [startsAt, setStartsAt] = useState(localNow(5));
  const [endsAt, setEndsAt] = useState(localNow(65));
  const [duration, setDuration] = useState("30");
  const [selected, setSelected] = useState<string[]>([]);

  const pool = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (questions.data ?? [])
      .filter((q) => q.qtype === "mcq")
      .filter((q) => filterModule === "all" || q.module_id === filterModule)
      .filter((q) => !term || String(q.prompt).toLowerCase().includes(term));
  }, [questions.data, filterModule, search]);

  const byId = useMemo(
    () => new Map((questions.data ?? []).map((q) => [q.id, q])),
    [questions.data],
  );
  const totalMarks = selected.reduce((sum, id) => sum + Number(byId.get(id)?.marks ?? 1), 0);

  const errors: Record<string, string> = {};
  if (title.trim().length < 3) errors.title = "Give the exam a title of at least 3 characters.";
  if (!startsAt || Number.isNaN(new Date(startsAt).getTime()))
    errors.startsAt = "Pick a valid start time.";
  if (endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime())
    errors.endsAt = "The window must close after it opens.";
  const dur = Number(duration);
  if (!Number.isInteger(dur) || dur < 1 || dur > 300)
    errors.duration = "Duration must be between 1 and 300 minutes.";
  if (selected.length === 0) errors.items = "Pick at least one question.";
  const valid = Object.keys(errors).length === 0;

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          title: title.trim(),
          batch_id: batchId === "none" ? null : batchId,
          module_id: moduleId === "none" ? null : moduleId,
          assessment_id: null,
          starts_at: new Date(startsAt).toISOString(),
          ends_at: endsAt ? new Date(endsAt).toISOString() : null,
          duration_min: dur,
          shuffle: true,
          publish: true,
          items: selected.map((id) => ({
            question_id: id,
            marks: Number(byId.get(id)?.marks ?? 1),
          })),
        },
      }),
    onSuccess: (r) => {
      toast.success(`Exam published with ${r.items} questions`);
      setSelected([]);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["tests"] });
    },
    onError: (e: unknown) => toast.error(formatFormError(e, "Could not create this exam.")),
  });

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <ListChecks className="h-4 w-4" /> Build MCQ exam
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Build an MCQ exam</DialogTitle>
          <DialogDescription>
            Pick the exact questions and set the window students may write in.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Title</Label>
            <Input value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Module tag</Label>
            <Select value={moduleId} onValueChange={setModuleId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No module</SelectItem>
                {(modules.data?.modules ?? []).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.code} — {m.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Label>Window opens</Label>
            <Input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
            {errors.startsAt && <p className="text-xs text-destructive">{errors.startsAt}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Window closes</Label>
            <Input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
            {errors.endsAt && <p className="text-xs text-destructive">{errors.endsAt}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Duration per student (min)</Label>
            <Input
              type="number"
              min={1}
              max={300}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            {errors.duration && <p className="text-xs text-destructive">{errors.duration}</p>}
          </div>
          <div className="flex items-end">
            <p className="text-xs text-muted-foreground">
              Students may start any time inside the window; their personal timer is the duration
              above and auto-submits at whichever comes first.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>
              Questions{" "}
              <Badge variant="secondary" className="ml-1">
                {selected.length} picked · {totalMarks} marks
              </Badge>
            </Label>
            <div className="flex flex-wrap gap-2">
              <Select value={filterModule} onValueChange={setFilterModule}>
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All modules</SelectItem>
                  {(modules.data?.modules ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="h-8 w-44 text-xs"
                placeholder="Search prompt"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => setSelected(pool.map((q) => q.id))}
              >
                Select all shown
              </Button>
            </div>
          </div>

          <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-2">
            {pool.map((q) => (
              <label
                key={q.id}
                className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 hover:bg-muted/60"
              >
                <Checkbox
                  checked={selected.includes(q.id)}
                  onCheckedChange={() => toggle(q.id)}
                  className="mt-0.5"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{q.prompt}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {q.level} · {q.marks} mark(s) · {q.bloom}
                  </span>
                </span>
              </label>
            ))}
            {pool.length === 0 && (
              <p className="p-2 text-sm text-muted-foreground">
                No MCQs match. Import some from Notepad on the question bank page.
              </p>
            )}
          </div>
          {errors.items && <p className="text-xs text-destructive">{errors.items}</p>}
        </div>

        <DialogFooter>
          <Button disabled={!valid || create.isPending} onClick={() => create.mutate()}>
            Publish exam
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
