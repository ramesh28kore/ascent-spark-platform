import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { generateTest, setTestPublished, deleteTest } from "@/lib/tests.functions";
import { formatFormError } from "@/lib/form-errors";

import {
  assessmentsQuery,
  batchesQuery,
  meQuery,
  modulesQuery,
  questionsQuery,
  testsQuery,
} from "@/lib/crt-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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

type TestsSearch = { assessment?: string; type?: "mcq" | "coding" | "mixed" };

export const Route = createFileRoute("/_authenticated/tests/")({
  validateSearch: (search: Record<string, unknown>): TestsSearch => ({
    assessment: typeof search.assessment === "string" ? search.assessment : undefined,
    type:
      search.type === "coding" || search.type === "mixed" || search.type === "mcq"
        ? search.type
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Online tests — CRT Training Console" },
      {
        name: "description",
        content:
          "Auto-generate timed MCQ tests from the question bank with difficulty mix, shuffling and instant scoring.",
      },
      { property: "og:title", content: "Online tests — CRT Training Console" },
      { property: "og:description", content: "Timed CRT test engine with auto evaluation." },
    ],
  }),
  component: TestsPage,
});

function TestsPage() {
  const search = Route.useSearch();
  const me = useQuery(meQuery);
  const assessments = useQuery(assessmentsQuery);
  const tests = useQuery(testsQuery);
  const modules = useQuery(modulesQuery);
  const batches = useQuery(batchesQuery);
  const questions = useQuery(questionsQuery);
  const queryClient = useQueryClient();
  const gen = useServerFn(generateTest);
  const publish = useServerFn(setTestPublished);
  const remove = useServerFn(deleteTest);

  const isStaff = !!me.data?.isStaff;
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Weekly test");
  const [moduleId, setModuleId] = useState("none");
  const [batchId, setBatchId] = useState("none");
  const [count, setCount] = useState("20");
  const [duration, setDuration] = useState("30");
  const [when, setWhen] = useState(new Date().toISOString().slice(0, 16));
  const [mix, setMix] = useState({ easy: "50", medium: "35", hard: "15" });
  const [qtype, setQtype] = useState<"mcq" | "coding" | "mixed">(search.type ?? "mcq");
  const [assessmentId, setAssessmentId] = useState(search.assessment ?? "none");

  // Prefill and open the dialog when arriving from an assessment.
  useEffect(() => {
    if (!search.assessment) return;
    setAssessmentId(search.assessment);
    if (search.type) setQtype(search.type);
    setOpen(true);
  }, [search.assessment, search.type]);

  const linkedAssessment = (assessments.data?.assessments ?? []).find(
    (a) => a.id === assessmentId,
  );
  useEffect(() => {
    if (!linkedAssessment) return;
    setTitle(linkedAssessment.title);
    setWhen(new Date(`${linkedAssessment.scheduled_on}T09:00`).toISOString().slice(0, 16));
    if (linkedAssessment.module_id) setModuleId(linkedAssessment.module_id);
    if (linkedAssessment.kind === "coding_test") setQtype("coding");
  }, [linkedAssessment?.id]);

  const fieldErrors = (() => {
    const errs: Record<string, string> = {};
    const dur = Number(duration);
    const qty = Number(count);
    if (title.trim().length < 3) errs.title = "Give the test a title of at least 3 characters.";
    if (title.trim().length > 160) errs.title = "Keep the title under 160 characters.";
    if (!Number.isFinite(dur) || !Number.isInteger(dur) || dur < 5 || dur > 300)
      errs.duration = "Duration must be a whole number between 5 and 300 minutes.";
    if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty < 1 || qty > 100)
      errs.count = "Pick between 1 and 100 questions.";
    if (!when || Number.isNaN(new Date(when).getTime()))
      errs.when = "Pick a valid start date and time.";
    return errs;
  })();
  const formValid = Object.keys(fieldErrors).length === 0;

  const create = useMutation({
    mutationFn: () =>
      gen({
        data: {
          title: title.trim(),
          batch_id: batchId === "none" ? null : batchId,
          module_id: moduleId === "none" ? null : moduleId,
          assessment_id: assessmentId === "none" ? null : assessmentId,
          starts_at: new Date(when).toISOString(),
          duration_min: Number(duration),
          count: Number(count),
          easy_pct: Number(mix.easy) || 0,
          medium_pct: Number(mix.medium) || 0,
          hard_pct: Number(mix.hard) || 0,
          shuffle: true,
          publish: true,
          qtypes:
            qtype === "mixed" ? ["mcq", "coding", "descriptive"] : qtype === "coding" ? ["coding"] : ["mcq"],
        },
      }),
    onSuccess: (r) => {
      toast.success(`Test generated with ${r.items} questions`);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["tests"] });
    },
    onError: (e: unknown) => toast.error(formatFormError(e, "Could not generate the test.")),
  });


  const togglePublish = useMutation({
    mutationFn: (vars: { id: string; published: boolean }) => publish({ data: vars }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tests"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Test deleted");
      queryClient.invalidateQueries({ queryKey: ["tests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = tests.data?.tests ?? [];
  const items = tests.data?.items ?? [];
  const attempts = tests.data?.attempts ?? [];
  const mcqCount = (questions.data ?? []).filter((q) => q.qtype === "mcq").length;
  const codingCount = (questions.data ?? []).filter((q) => q.qtype === "coding").length;
  const typeById = new Map((tests.data?.questionTypes ?? []).map((q) => [q.id, q.qtype]));
  const testKind = (testId: string) => {
    const kinds = new Set(
      items.filter((i) => i.test_id === testId).map((i) => typeById.get(i.question_id)),
    );
    if (kinds.has("coding") && kinds.size > 1) return "Mixed";
    if (kinds.has("coding")) return "Coding";
    return "MCQ";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Online tests</h1>
          <p className="text-sm text-muted-foreground">
            {isStaff
              ? `${mcqCount} MCQs and ${codingCount} coding questions available for auto-generation.`
              : "Take your scheduled tests and see instant results."}
          </p>
        </div>
        {isStaff && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Generate test
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Auto-generate a test</DialogTitle>
                <DialogDescription>
                  Questions are picked from the bank using your difficulty mix.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Title</Label>
                  <Input
                    value={title}
                    maxLength={160}
                    aria-invalid={!!fieldErrors.title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  {fieldErrors.title && (
                    <p className="text-xs text-destructive">{fieldErrors.title}</p>
                  )}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Link to assessment</Label>
                  <Select value={assessmentId} onValueChange={setAssessmentId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not linked</SelectItem>
                      {(assessments.data?.assessments ?? []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.title} · {a.scheduled_on}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Linked tests show an Open test button on the student assessments page.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>Module</Label>
                  <Select value={moduleId} onValueChange={setModuleId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">All modules</SelectItem>
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
                  <Label>Question type</Label>
                  <Select value={qtype} onValueChange={(v) => setQtype(v as typeof qtype)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mcq">MCQ only</SelectItem>
                      <SelectItem value="coding">Coding only</SelectItem>
                      <SelectItem value="mixed">Mixed (MCQ + coding)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Questions</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={count}
                    aria-invalid={!!fieldErrors.count}
                    onChange={(e) => setCount(e.target.value)}
                  />
                  {fieldErrors.count && (
                    <p className="text-xs text-destructive">{fieldErrors.count}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Duration (min)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={300}
                    value={duration}
                    aria-invalid={!!fieldErrors.duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                  {fieldErrors.duration && (
                    <p className="text-xs text-destructive">{fieldErrors.duration}</p>
                  )}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Starts at</Label>
                  <Input
                    type="datetime-local"
                    value={when}
                    aria-invalid={!!fieldErrors.when}
                    onChange={(e) => setWhen(e.target.value)}
                  />
                  {fieldErrors.when && <p className="text-xs text-destructive">{fieldErrors.when}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label>Easy %</Label>
                  <Input
                    type="number"
                    value={mix.easy}
                    onChange={(e) => setMix((m) => ({ ...m, easy: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Medium %</Label>
                  <Input
                    type="number"
                    value={mix.medium}
                    onChange={(e) => setMix((m) => ({ ...m, medium: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Hard %</Label>
                  <Input
                    type="number"
                    value={mix.hard}
                    onChange={(e) => setMix((m) => ({ ...m, hard: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => create.mutate()}
                  disabled={create.isPending || !formValid}
                >
                  Generate
                </Button>

              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((t) => {
          const qCount = items.filter((i) => i.test_id === t.id).length;
          const done = attempts.filter((a) => a.test_id === t.id && a.submitted_at);
          const myAttempt = done[0];
          return (
            <Card key={t.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span className="truncate">{t.title}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <Badge variant="outline">{testKind(t.id)}</Badge>
                    <Badge variant={t.published ? "default" : "secondary"}>
                      {t.published ? "Published" : "Draft"}
                    </Badge>
                  </span>
                </CardTitle>
                <CardDescription>
                  {new Date(t.starts_at).toLocaleString()} · {t.duration_min} min · {qCount} questions
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to="/tests/$testId" params={{ testId: t.id }}>
                    {isStaff ? "Preview / results" : myAttempt ? "Review" : "Start test"}
                  </Link>
                </Button>
                {isStaff && (
                  <>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Switch
                        checked={t.published}
                        onCheckedChange={(v) => togglePublish.mutate({ id: t.id, published: v })}
                      />
                      Publish
                    </div>
                    <span className="text-xs text-muted-foreground">{done.length} submitted</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="ml-auto"
                      aria-label="Delete test"
                      onClick={() => del.mutate(t.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
        {list.length === 0 && <p className="text-sm text-muted-foreground">No tests yet.</p>}
      </div>
    </div>
  );
}
