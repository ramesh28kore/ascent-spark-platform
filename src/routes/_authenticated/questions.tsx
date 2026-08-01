import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Shuffle } from "lucide-react";

import { createQuestion } from "@/lib/crt.functions";
import { meQuery, modulesQuery, questionsQuery } from "@/lib/crt-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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

export const Route = createFileRoute("/_authenticated/questions")({
  head: () => ({
    meta: [
      { title: "Question bank — CRT Training Console" },
      {
        name: "description",
        content:
          "Bloom-tagged CRT question bank with difficulty filters and a mock test generator.",
      },
      { property: "og:title", content: "Question bank — CRT Training Console" },
      { property: "og:description", content: "Build mock NQT papers from a tagged question bank." },
    ],
  }),
  component: QuestionsPage,
});

const LEVELS = ["easy", "medium", "hard"] as const;
const BLOOMS = ["L1", "L2", "L3", "L4", "L5", "L6"] as const;
const TYPES = ["mcq", "coding", "descriptive"] as const;

function QuestionsPage() {
  const me = useQuery(meQuery);
  const questions = useQuery(questionsQuery);
  const modules = useQuery(modulesQuery);
  const queryClient = useQueryClient();
  const add = useServerFn(createQuestion);

  const [moduleFilter, setModuleFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [paper, setPaper] = useState<string[]>([]);
  const [count, setCount] = useState("10");
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    prompt: "",
    qtype: "mcq" as (typeof TYPES)[number],
    options: "",
    test_cases: "",
    answer: "",
    explanation: "",
    level: "medium" as (typeof LEVELS)[number],
    bloom: "L3" as (typeof BLOOMS)[number],
    marks: "1",
    module_id: "none",
  });

  const all = questions.data ?? [];
  const filtered = useMemo(
    () =>
      all.filter(
        (q) =>
          (moduleFilter === "all" || q.module_id === moduleFilter) &&
          (levelFilter === "all" || q.level === levelFilter),
      ),
    [all, moduleFilter, levelFilter],
  );

  const parseCases = (raw: string) =>
    raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.includes("=>"))
      .slice(0, 20)
      .map((line) => {
        const hidden = line.startsWith("#");
        const body = hidden ? line.slice(1) : line;
        const [input, ...rest] = body.split("=>");
        return {
          input: input.trim().replace(/\\n/g, "\n"),
          expected_output: rest.join("=>").trim().replace(/\\n/g, "\n"),
          hidden,
        };
      });

  const createMutation = useMutation({
    mutationFn: () =>
      add({
        data: {
          module_id: form.module_id === "none" ? null : form.module_id,
          prompt: form.prompt.trim(),
          qtype: form.qtype,
          options: form.options
            .split("\n")
            .map((o) => o.trim())
            .filter(Boolean)
            .slice(0, 6),
          test_cases: form.qtype === "coding" ? parseCases(form.test_cases) : [],
          answer: form.answer.trim(),
          explanation: form.explanation.trim(),
          level: form.level,
          bloom: form.bloom,
          marks: Number(form.marks),
        },
      }),
    onSuccess: () => {
      toast.success("Question added");
      setOpen(false);
      setForm({ ...form, prompt: "", options: "", test_cases: "", answer: "", explanation: "" });
      queryClient.invalidateQueries({ queryKey: ["questions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function generate() {
    const n = Math.max(1, Math.min(50, Number(count) || 10));
    const pool = [...filtered].sort(() => Math.random() - 0.5).slice(0, n);
    if (!pool.length) return toast.error("No questions match these filters");
    setPaper(pool.map((q) => q.id));
    toast.success(`Generated a ${pool.length}-question paper`);
  }

  if (questions.isLoading) return <Skeleton className="h-96 w-full" />;

  const isTrainer = me.data?.isTrainer ?? false;
  const shown = paper.length ? all.filter((q) => paper.includes(q.id)) : filtered;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Question bank</h1>
          <p className="text-sm text-muted-foreground">
            {all.length} questions tagged by module, difficulty and Bloom level.
          </p>
        </div>
        {isTrainer && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Add question
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display">New question</DialogTitle>
                <DialogDescription>Tag it so the generator can use it.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Prompt</Label>
                  <Textarea
                    value={form.prompt}
                    onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                    maxLength={2000}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select
                      value={form.qtype}
                      onValueChange={(v) => setForm({ ...form, qtype: v as typeof form.qtype })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Module</Label>
                    <Select
                      value={form.module_id}
                      onValueChange={(v) => setForm({ ...form, module_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {(modules.data?.modules ?? []).map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.code} · {m.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Difficulty</Label>
                    <Select
                      value={form.level}
                      onValueChange={(v) => setForm({ ...form, level: v as typeof form.level })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEVELS.map((l) => (
                          <SelectItem key={l} value={l}>
                            {l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Bloom level</Label>
                    <Select
                      value={form.bloom}
                      onValueChange={(v) => setForm({ ...form, bloom: v as typeof form.bloom })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BLOOMS.map((b) => (
                          <SelectItem key={b} value={b}>
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Options (one per line, MCQ only)</Label>
                  <Textarea
                    value={form.options}
                    onChange={(e) => setForm({ ...form, options: e.target.value })}
                    rows={4}
                  />
                </div>
                {form.qtype === "coding" && (
                  <div className="space-y-1.5">
                    <Label>Test cases (coding only)</Label>
                    <Textarea
                      value={form.test_cases}
                      onChange={(e) => setForm({ ...form, test_cases: e.target.value })}
                      rows={4}
                      spellCheck={false}
                      className="font-mono text-xs"
                      placeholder={
                        "5 3 => 8\n#10 -2 => 8   (prefix # to hide a case from students)"
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      One case per line as <code>input =&gt; expected output</code>. Use{" "}
                      <code>\n</code> for multi-line input. Hidden cases are graded but never shown.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Answer</Label>
                    <Input
                      value={form.answer}
                      onChange={(e) => setForm({ ...form, answer: e.target.value })}
                      maxLength={500}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Marks</Label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={form.marks}
                      onChange={(e) => setForm({ ...form, marks: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Explanation</Label>
                  <Textarea
                    value={form.explanation}
                    onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                    maxLength={1000}
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  disabled={createMutation.isPending}
                  onClick={() => {
                    if (form.prompt.trim().length < 5) return toast.error("Prompt is too short");
                    createMutation.mutate();
                  }}
                >
                  Save question
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base">Test generator</CardTitle>
          <CardDescription>Filter the bank, then draw a randomised paper.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label>Module</Label>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modules</SelectItem>
                {(modules.data?.modules ?? []).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.code} · {m.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Difficulty</Label>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Questions</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className="w-24"
            />
          </div>
          <Button onClick={generate} className="gap-2">
            <Shuffle className="h-4 w-4" /> Generate paper
          </Button>
          {paper.length > 0 && (
            <Button variant="ghost" onClick={() => setPaper([])}>
              Clear paper
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {shown.map((q, i) => (
          <Card key={q.id}>
            <CardContent className="space-y-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="text-sm font-medium">
                  {paper.length ? `Q${i + 1}. ` : ""}
                  {q.prompt}
                </p>
                <div className="flex shrink-0 gap-1.5">
                  <Badge variant="outline">{q.level}</Badge>
                  <Badge variant="secondary">{q.bloom}</Badge>
                  <Badge>{q.marks}m</Badge>
                </div>
              </div>
              {Array.isArray(q.options) && q.options.length > 0 && (
                <ol className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                  {(q.options as string[]).map((o, idx) => (
                    <li key={idx}>
                      {String.fromCharCode(65 + idx)}. {o}
                    </li>
                  ))}
                </ol>
              )}
              {isTrainer && q.answer && (
                <p className="rounded-md bg-secondary p-2 text-xs text-secondary-foreground">
                  Answer: {q.answer}
                  {q.explanation ? ` — ${q.explanation}` : ""}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
        {shown.length === 0 && (
          <p className="text-sm text-muted-foreground">No questions match these filters.</p>
        )}
      </div>
    </div>
  );
}
