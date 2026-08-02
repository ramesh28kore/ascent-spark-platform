import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Play, Plus, Save, Send, Trash2, Undo2, XCircle } from "lucide-react";

import {
  deleteAuthoredProblem,
  listAuthoredProblems,
  saveProblemDraft,
  setProblemStatus,
  validateProblemCases,
} from "@/lib/authoring.functions";
import { emptyDraft, publishBlockers, slugify, type AuthoringDraft } from "@/lib/authoring-shared";
import { modulesQuery } from "@/lib/crt-queries";
import { formatFormError } from "@/lib/form-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/authoring")({
  head: () => ({
    meta: [
      { title: "Authoring studio — CRT Training Console" },
      {
        name: "description",
        content:
          "Write coding problems, add sample and hidden test cases, validate them against the judge and publish to targeted batches.",
      },
      { property: "og:title", content: "Authoring studio — CRT Training Console" },
      {
        property: "og:description",
        content: "Trainer workspace for authoring, validating and publishing coding problems.",
      },
    ],
  }),
  component: AuthoringPage,
});

type ValidationState = {
  allPassed: boolean;
  passed: number;
  total: number;
  results: { index: number; passed: boolean; expected?: string; actual?: string; error?: string }[];
} | null;

const CATEGORIES = [
  "Arrays",
  "Strings",
  "Hashing",
  "Two pointers",
  "Sliding window",
  "Stacks",
  "Linked list",
  "Trees",
  "Graphs",
  "Dynamic programming",
  "Greedy",
  "Maths",
  "Sorting",
  "Searching",
];

function AuthoringPage() {
  const queryClient = useQueryClient();
  const load = useServerFn(listAuthoredProblems);
  const save = useServerFn(saveProblemDraft);
  const validate = useServerFn(validateProblemCases);
  const publish = useServerFn(setProblemStatus);
  const remove = useServerFn(deleteAuthoredProblem);

  const bank = useQuery({ queryKey: ["authoring"], queryFn: () => load() });
  const modules = useQuery(modulesQuery);

  const [draft, setDraft] = useState<AuthoringDraft>(emptyDraft());
  const [tagInput, setTagInput] = useState("");
  const [validation, setValidation] = useState<ValidationState>(null);

  const set = <K extends keyof AuthoringDraft>(key: K, value: AuthoringDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const blockers = useMemo(
    () =>
      publishBlockers({
        test_cases: draft.test_cases,
        statement: draft.statement,
        solution: draft.solution,
        visible_to_all_batches: draft.visible_to_all_batches,
        batch_ids: draft.batch_ids,
      }),
    [draft],
  );

  const saveMutation = useMutation({
    mutationFn: () => save({ data: draft }),
    onSuccess: (res) => {
      set("id", res.id);
      toast.success("Draft saved");
      queryClient.invalidateQueries({ queryKey: ["authoring"] });
    },
    onError: (e: Error) => toast.error(formatFormError(e)),
  });

  const validateMutation = useMutation({
    mutationFn: () =>
      validate({
        data: {
          language: draft.reference_language,
          code: draft.solution ?? "",
          time_limit_ms: draft.time_limit_ms,
          memory_limit_kb: draft.memory_limit_kb,
          cases: draft.test_cases,
        },
      }),
    onSuccess: (res) => {
      setValidation(res as ValidationState);
      if (res.allPassed) toast.success(`All ${res.total} cases pass the reference solution`);
      else toast.error(`${res.total - res.passed} case(s) failed — fix them before publishing`);
    },
    onError: (e: Error) => toast.error(formatFormError(e)),
  });

  const publishMutation = useMutation({
    mutationFn: (input: { id: string; status: "draft" | "published" }) =>
      publish({ data: input }),
    onSuccess: (res) => {
      toast.success(res.status === "published" ? "Published to students" : "Moved back to draft");
      queryClient.invalidateQueries({ queryKey: ["authoring"] });
      queryClient.invalidateQueries({ queryKey: ["problems"] });
    },
    onError: (e: Error) => toast.error(formatFormError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Draft deleted");
      setDraft(emptyDraft());
      queryClient.invalidateQueries({ queryKey: ["authoring"] });
    },
    onError: (e: Error) => toast.error(formatFormError(e)),
  });

  const startEdit = (id: string) => {
    const row = (bank.data?.problems ?? []).find((p) => p.id === id);
    if (!row) return;
    const targets = (bank.data?.targets ?? [])
      .filter((t) => t.problem_id === id)
      .map((t) => t.batch_id);
    const starter = (row.starter_code ?? {}) as { python?: string; javascript?: string };
    setValidation(null);
    setDraft({
      ...emptyDraft(),
      id: row.id,
      title: row.title,
      slug: row.slug ?? slugify(row.title),
      level: row.level as AuthoringDraft["level"],
      category: row.category ?? "Arrays",
      company: row.company,
      company_frequency: row.company_frequency ?? 0,
      module_id: row.module_id,
      points: row.points ?? 10,
      tags: (row.tags ?? []) as string[],
      statement: row.statement ?? "",
      constraints: row.constraints,
      examples: (row.examples ?? []) as AuthoringDraft["examples"],
      hints: (row.hints ?? []) as string[],
      test_cases: ((row.test_cases ?? []) as AuthoringDraft["test_cases"]).map((c) => ({
        input: c.input ?? "",
        expected_output: c.expected_output ?? "",
        hidden: !!c.hidden,
      })),
      starter_code: { python: starter.python ?? "", javascript: starter.javascript ?? "" },
      solution: row.solution,
      editorial: row.editorial,
      time_limit_ms: row.time_limit_ms ?? 5000,
      memory_limit_kb: row.memory_limit_kb ?? 128000,
      visible_to_all_batches: row.visible_to_all_batches ?? true,
      batch_ids: targets,
    });
  };

  if (bank.isPending) return <Skeleton className="h-[70vh] w-full" />;
  if (bank.isError)
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          {formatFormError(bank.error as Error)}
        </CardContent>
      </Card>
    );

  const problems = bank.data?.problems ?? [];
  const batches = bank.data?.batches ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Authoring studio</h1>
        <p className="text-sm text-muted-foreground">
          Draft a problem, prove every test case against your own solution, then publish it to the
          batches that should see it.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
        {/* ------------------------------------------------------------ bank */}
        <Card className="h-fit">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="text-base">Problem bank</CardTitle>
              <CardDescription>{problems.length} authored</CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => {
                setDraft(emptyDraft());
                setValidation(null);
              }}
            >
              <Plus className="size-4" /> New
            </Button>
          </CardHeader>
          <CardContent className="max-h-[70vh] space-y-2 overflow-y-auto">
            {problems.length === 0 && (
              <p className="text-sm text-muted-foreground">No problems authored yet.</p>
            )}
            {problems.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => startEdit(p.id)}
                className={`w-full rounded-md border p-3 text-left transition hover:bg-muted/60 ${
                  draft.id === p.id ? "border-primary bg-muted/40" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">{p.title}</span>
                  <Badge variant={p.status === "published" ? "default" : "secondary"}>
                    {p.status}
                  </Badge>
                </div>
                <p className="mt-1 text-xs capitalize text-muted-foreground">
                  {p.level} · {p.category ?? "—"} ·{" "}
                  {Array.isArray(p.test_cases) ? p.test_cases.length : 0} cases
                </p>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* --------------------------------------------------------- editor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {draft.id ? "Edit problem" : "New problem"}
            </CardTitle>
            <CardDescription>
              Students only ever see published problems targeted at their batch.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="details">
              <TabsList className="flex-wrap">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="statement">Statement</TabsTrigger>
                <TabsTrigger value="cases">Test cases</TabsTrigger>
                <TabsTrigger value="solution">Solution & editorial</TabsTrigger>
                <TabsTrigger value="publish">Publish</TabsTrigger>
              </TabsList>

              {/* details */}
              <TabsContent value="details" className="space-y-4 pt-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={draft.title}
                      onChange={(e) => {
                        const title = e.target.value;
                        setDraft((d) => ({
                          ...d,
                          title,
                          slug: d.id ? d.slug : slugify(title),
                        }));
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="slug">Slug</Label>
                    <Input
                      id="slug"
                      value={draft.slug}
                      onChange={(e) => set("slug", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Difficulty</Label>
                    <Select
                      value={draft.level}
                      onValueChange={(v) => set("level", v as AuthoringDraft["level"])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Topic</Label>
                    <Select value={draft.category} onValueChange={(v) => set("category", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Module</Label>
                    <Select
                      value={draft.module_id ?? "none"}
                      onValueChange={(v) => set("module_id", v === "none" ? null : v)}
                    >
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
                    <Label htmlFor="points">Marks</Label>
                    <Input
                      id="points"
                      type="number"
                      min={1}
                      max={100}
                      value={draft.points}
                      onChange={(e) => set("points", Number(e.target.value) || 1)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="company">Company tag</Label>
                    <Input
                      id="company"
                      value={draft.company ?? ""}
                      placeholder="TCS, Infosys, Amazon…"
                      onChange={(e) => set("company", e.target.value.trim() || null)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="freq">Company frequency (0–100)</Label>
                    <Input
                      id="freq"
                      type="number"
                      min={0}
                      max={100}
                      value={draft.company_frequency}
                      onChange={(e) =>
                        set("company_frequency", Math.max(0, Math.min(100, Number(e.target.value) || 0)))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {draft.tags.map((t) => (
                      <Badge
                        key={t}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() =>
                          set(
                            "tags",
                            draft.tags.filter((x) => x !== t),
                          )
                        }
                      >
                        {t} ×
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      placeholder="add a tag and press Add"
                      onChange={(e) => setTagInput(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const t = tagInput.trim();
                        if (t && !draft.tags.includes(t)) set("tags", [...draft.tags, t]);
                        setTagInput("");
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* statement */}
              <TabsContent value="statement" className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="statement">Problem statement</Label>
                  <Textarea
                    id="statement"
                    rows={10}
                    value={draft.statement}
                    onChange={(e) => set("statement", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="constraints">Constraints</Label>
                  <Textarea
                    id="constraints"
                    rows={4}
                    value={draft.constraints ?? ""}
                    onChange={(e) => set("constraints", e.target.value || null)}
                  />
                </div>

                <Separator />
                <div className="flex items-center justify-between">
                  <Label>Worked examples</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() =>
                      set("examples", [...draft.examples, { input: "", output: "", explanation: "" }])
                    }
                  >
                    <Plus className="size-4" /> Example
                  </Button>
                </div>
                {draft.examples.map((ex, i) => (
                  <div key={i} className="grid gap-2 rounded-md border p-3 sm:grid-cols-3">
                    <Textarea
                      rows={3}
                      placeholder="input"
                      value={ex.input}
                      onChange={(e) =>
                        set(
                          "examples",
                          draft.examples.map((x, j) =>
                            j === i ? { ...x, input: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <Textarea
                      rows={3}
                      placeholder="output"
                      value={ex.output}
                      onChange={(e) =>
                        set(
                          "examples",
                          draft.examples.map((x, j) =>
                            j === i ? { ...x, output: e.target.value } : x,
                          ),
                        )
                      }
                    />
                    <div className="flex gap-2">
                      <Textarea
                        rows={3}
                        placeholder="explanation"
                        value={ex.explanation ?? ""}
                        onChange={(e) =>
                          set(
                            "examples",
                            draft.examples.map((x, j) =>
                              j === i ? { ...x, explanation: e.target.value } : x,
                            ),
                          )
                        }
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          set(
                            "examples",
                            draft.examples.filter((_, j) => j !== i),
                          )
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Separator />
                <div className="flex items-center justify-between">
                  <Label>Hints</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => set("hints", [...draft.hints, ""])}
                  >
                    <Plus className="size-4" /> Hint
                  </Button>
                </div>
                {draft.hints.map((h, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={h}
                      onChange={(e) =>
                        set(
                          "hints",
                          draft.hints.map((x, j) => (j === i ? e.target.value : x)),
                        )
                      }
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        set(
                          "hints",
                          draft.hints.filter((_, j) => j !== i),
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </TabsContent>

              {/* cases */}
              <TabsContent value="cases" className="space-y-3 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    Visible cases are shown to students as samples; hidden cases only run on submit.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() =>
                      set("test_cases", [
                        ...draft.test_cases,
                        { input: "", expected_output: "", hidden: true },
                      ])
                    }
                  >
                    <Plus className="size-4" /> Test case
                  </Button>
                </div>

                {draft.test_cases.map((c, i) => {
                  const result = validation?.results.find((r) => r.index === i);
                  return (
                    <div key={i} className="rounded-md border p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold">Case {i + 1}</span>
                        <div className="flex items-center gap-3">
                          {result ? (
                            result.passed ? (
                              <span className="flex items-center gap-1 text-xs text-emerald-600">
                                <CheckCircle2 className="size-3.5" /> passes
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-destructive">
                                <XCircle className="size-3.5" /> fails
                              </span>
                            )
                          ) : null}
                          <label className="flex items-center gap-2 text-xs">
                            <Switch
                              checked={c.hidden}
                              onCheckedChange={(v) =>
                                set(
                                  "test_cases",
                                  draft.test_cases.map((x, j) =>
                                    j === i ? { ...x, hidden: v } : x,
                                  ),
                                )
                              }
                            />
                            Hidden
                          </label>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              set(
                                "test_cases",
                                draft.test_cases.filter((_, j) => j !== i),
                              )
                            }
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Textarea
                          rows={3}
                          placeholder="stdin"
                          className="font-mono text-xs"
                          value={c.input}
                          onChange={(e) =>
                            set(
                              "test_cases",
                              draft.test_cases.map((x, j) =>
                                j === i ? { ...x, input: e.target.value } : x,
                              ),
                            )
                          }
                        />
                        <Textarea
                          rows={3}
                          placeholder="expected output"
                          className="font-mono text-xs"
                          value={c.expected_output}
                          onChange={(e) =>
                            set(
                              "test_cases",
                              draft.test_cases.map((x, j) =>
                                j === i ? { ...x, expected_output: e.target.value } : x,
                              ),
                            )
                          }
                        />
                      </div>
                      {result && !result.passed ? (
                        <pre className="mt-2 whitespace-pre-wrap rounded bg-muted p-2 font-mono text-xs">
                          got: {result.actual ?? result.error ?? "—"}
                        </pre>
                      ) : null}
                    </div>
                  );
                })}

                <Button
                  type="button"
                  className="gap-2"
                  disabled={validateMutation.isPending || !draft.solution}
                  onClick={() => validateMutation.mutate()}
                >
                  <Play className="size-4" />
                  {validateMutation.isPending ? "Running judge…" : "Validate against solution"}
                </Button>
                {validation ? (
                  <p className="text-sm">
                    {validation.passed}/{validation.total} cases pass.
                  </p>
                ) : null}
              </TabsContent>

              {/* solution */}
              <TabsContent value="solution" className="space-y-4 pt-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Reference language</Label>
                    <Select
                      value={draft.reference_language}
                      onValueChange={(v) =>
                        set("reference_language", v as AuthoringDraft["reference_language"])
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tl">Time limit (ms)</Label>
                    <Input
                      id="tl"
                      type="number"
                      min={500}
                      max={15000}
                      value={draft.time_limit_ms}
                      onChange={(e) => set("time_limit_ms", Number(e.target.value) || 5000)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="solution">Reference solution</Label>
                  <Textarea
                    id="solution"
                    rows={10}
                    className="font-mono text-xs"
                    value={draft.solution ?? ""}
                    onChange={(e) => set("solution", e.target.value || null)}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="sp">Python starter code</Label>
                    <Textarea
                      id="sp"
                      rows={6}
                      className="font-mono text-xs"
                      value={draft.starter_code.python}
                      onChange={(e) =>
                        set("starter_code", { ...draft.starter_code, python: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sj">JavaScript starter code</Label>
                    <Textarea
                      id="sj"
                      rows={6}
                      className="font-mono text-xs"
                      value={draft.starter_code.javascript}
                      onChange={(e) =>
                        set("starter_code", { ...draft.starter_code, javascript: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editorial">Editorial (unlocks after solving)</Label>
                  <Textarea
                    id="editorial"
                    rows={8}
                    value={draft.editorial ?? ""}
                    onChange={(e) => set("editorial", e.target.value || null)}
                  />
                </div>
              </TabsContent>

              {/* publish */}
              <TabsContent value="publish" className="space-y-4 pt-4">
                <label className="flex items-center gap-3 text-sm">
                  <Switch
                    checked={draft.visible_to_all_batches}
                    onCheckedChange={(v) => set("visible_to_all_batches", v)}
                  />
                  Visible to every batch
                </label>

                {!draft.visible_to_all_batches ? (
                  <div className="space-y-2 rounded-md border p-3">
                    <p className="text-sm font-medium">Target batches</p>
                    {batches.length === 0 && (
                      <p className="text-sm text-muted-foreground">No batches created yet.</p>
                    )}
                    {batches.map((b) => (
                      <label key={b.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={draft.batch_ids.includes(b.id)}
                          onCheckedChange={(v) =>
                            set(
                              "batch_ids",
                              v
                                ? [...draft.batch_ids, b.id]
                                : draft.batch_ids.filter((x) => x !== b.id),
                            )
                          }
                        />
                        {b.name}
                      </label>
                    ))}
                  </div>
                ) : null}

                <div className="rounded-md border p-3 text-sm">
                  <p className="font-medium">Publish checklist</p>
                  {blockers.length === 0 && validation?.allPassed ? (
                    <p className="mt-1 flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 className="size-4" /> Ready to publish.
                    </p>
                  ) : (
                    <ul className="mt-1 list-inside list-disc text-muted-foreground">
                      {blockers.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                      {!validation?.allPassed ? (
                        <li>Validate the test cases against your reference solution.</li>
                      ) : null}
                    </ul>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    className="gap-2"
                    disabled={
                      !draft.id ||
                      blockers.length > 0 ||
                      !validation?.allPassed ||
                      publishMutation.isPending
                    }
                    onClick={() =>
                      publishMutation.mutate({ id: draft.id!, status: "published" })
                    }
                  >
                    <Send className="size-4" /> Publish to students
                  </Button>
                  {draft.id ? (
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => publishMutation.mutate({ id: draft.id!, status: "draft" })}
                    >
                      <Undo2 className="size-4" /> Unpublish
                    </Button>
                  ) : null}
                  {draft.id ? (
                    <Button
                      variant="ghost"
                      className="gap-2 text-destructive"
                      onClick={() => deleteMutation.mutate(draft.id!)}
                    >
                      <Trash2 className="size-4" /> Delete draft
                    </Button>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  Save the draft first — publishing works on the saved version.
                </p>
              </TabsContent>
            </Tabs>

            <Separator className="my-4" />
            <Button
              className="gap-2"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              <Save className="size-4" />
              {saveMutation.isPending ? "Saving…" : "Save draft"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
