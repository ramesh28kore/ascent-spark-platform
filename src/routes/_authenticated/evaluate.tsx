import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  evaluateTheoryAnswer,
  listPendingTheory,
  listRubricScores,
  listRubrics,
  saveRubricScore,
  upsertRubric,
} from "@/lib/exams.functions";
import { questionsQuery, studentsQuery, testsQuery } from "@/lib/crt-queries";
import { getCodingSubmissions, overrideCodingScore } from "@/lib/coding.functions";
import { CaseResults } from "@/components/CaseResults";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/evaluate")({
  head: () => ({
    meta: [
      { title: "Evaluation desk — CRT Training Console" },
      {
        name: "description",
        content:
          "Grade descriptive theory answers and score practical viva performance against reusable rubrics.",
      },
      { property: "og:title", content: "Evaluation desk — CRT Training Console" },
      {
        property: "og:description",
        content: "Rubric-based theory and viva evaluation for CRT trainers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EvaluatePage,
});

type Criterion = { label: string; max: number };

function EvaluatePage() {
  const queryClient = useQueryClient();

  const pendingFn = useServerFn(listPendingTheory);
  const gradeFn = useServerFn(evaluateTheoryAnswer);
  const rubricsFn = useServerFn(listRubrics);
  const rubricScoresFn = useServerFn(listRubricScores);
  const saveRubricFn = useServerFn(upsertRubric);
  const scoreFn = useServerFn(saveRubricScore);

  const pending = useQuery({ queryKey: ["theory-answers"], queryFn: () => pendingFn() });
  const rubrics = useQuery({ queryKey: ["rubrics"], queryFn: () => rubricsFn() });
  const rubricScores = useQuery({ queryKey: ["rubric-scores"], queryFn: () => rubricScoresFn() });
  const students = useQuery(studentsQuery);
  const questions = useQuery(questionsQuery);

  const questionMap = useMemo(
    () => new Map((questions.data ?? []).map((q) => [q.id, q.prompt])),
    [questions.data],
  );
  const studentMap = useMemo(
    () => new Map((students.data ?? []).map((s) => [s.id, s.full_name])),
    [students.data],
  );

  const [drafts, setDrafts] = useState<Record<string, { awarded: string; comment: string }>>({});

  const grade = useMutation({
    mutationFn: (vars: { id: string; awarded: number; comment: string }) => gradeFn({ data: vars }),
    onSuccess: () => {
      toast.success("Answer evaluated");
      queryClient.invalidateQueries({ queryKey: ["theory-answers"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  /* rubric builder */
  const [rubricName, setRubricName] = useState("");
  const [rubricKind, setRubricKind] = useState<"theory" | "viva" | "programming">("viva");
  const [criteria, setCriteria] = useState<Criterion[]>([
    { label: "Concept clarity", max: 10 },
    { label: "Communication", max: 5 },
  ]);

  const createRubric = useMutation({
    mutationFn: () => saveRubricFn({ data: { name: rubricName, kind: rubricKind, criteria } }),
    onSuccess: () => {
      toast.success("Rubric saved");
      setRubricName("");
      queryClient.invalidateQueries({ queryKey: ["rubrics"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  /* viva scoring */
  const [scoreStudent, setScoreStudent] = useState("");
  const [scoreRubric, setScoreRubric] = useState("");
  const [scoreValues, setScoreValues] = useState<Record<string, string>>({});
  const [scoreComment, setScoreComment] = useState("");

  const activeRubric = (rubrics.data ?? []).find((r) => r.id === scoreRubric);
  const activeCriteria = (activeRubric?.criteria as Criterion[] | null) ?? [];

  const recordScore = useMutation({
    mutationFn: () =>
      scoreFn({
        data: {
          student_id: scoreStudent,
          rubric_id: scoreRubric,
          test_id: null,
          assessment_id: null,
          kind: (activeRubric?.kind ?? "viva") as "viva",
          scores: Object.fromEntries(
            activeCriteria.map((c) => [c.label, Number(scoreValues[c.label] ?? 0)]),
          ),
          comments: scoreComment,
          released: true,
        },
      }),
    onSuccess: (res) => {
      toast.success(`Recorded ${res.total}/${res.max_total}`);
      setScoreValues({});
      setScoreComment("");
      queryClient.invalidateQueries({ queryKey: ["rubric-scores"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  /* coding review */
  const submissionsFn = useServerFn(getCodingSubmissions);
  const overrideFn = useServerFn(overrideCodingScore);
  const tests = useQuery(testsQuery);
  const [reviewTest, setReviewTest] = useState("");
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const codingSubs = useQuery({
    queryKey: ["coding-submissions", reviewTest],
    queryFn: () => submissionsFn({ data: { test_id: reviewTest } }),
    enabled: !!reviewTest,
  });

  const override = useMutation({
    mutationFn: (vars: { id: string; ai_score: number }) => overrideFn({ data: vars }),
    onSuccess: () => {
      toast.success("Score updated");
      queryClient.invalidateQueries({ queryKey: ["coding-submissions", reviewTest] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const awaiting = (pending.data ?? []).filter((row) => row.evaluated_at === null);
  const done = (pending.data ?? []).filter((row) => row.evaluated_at !== null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Evaluation desk</h1>
        <p className="text-sm text-muted-foreground">
          Human marking for descriptive theory answers and practical viva, using reusable rubrics.
        </p>
      </div>

      <Tabs defaultValue="theory">
        <TabsList>
          <TabsTrigger value="theory">
            Theory answers
            {awaiting.length > 0 ? (
              <Badge variant="secondary" className="ml-2">
                {awaiting.length}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="coding">Coding review</TabsTrigger>
          <TabsTrigger value="viva">Viva scoring</TabsTrigger>
          <TabsTrigger value="rubrics">Rubrics</TabsTrigger>
        </TabsList>

        <TabsContent value="coding" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Coding submissions</CardTitle>
              <CardDescription>
                Per-case sandbox verdicts, including hidden cases, so you can confirm or override a
                machine score.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Test</Label>
                <Select value={reviewTest} onValueChange={setReviewTest}>
                  <SelectTrigger className="max-w-md">
                    <SelectValue placeholder="Pick a test" />
                  </SelectTrigger>
                  <SelectContent>
                    {(tests.data?.tests ?? []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {reviewTest && (codingSubs.data ?? []).length === 0 && !codingSubs.isLoading && (
                <p className="text-sm text-muted-foreground">
                  No coding submissions for this test yet.
                </p>
              )}

              {(codingSubs.data ?? []).map((row) => (
                <div key={row.id} className="space-y-3 rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">
                      {studentMap.get(row.student_id) ?? "Student"}
                    </span>
                    <Badge variant="outline">{row.verdict}</Badge>
                    <Badge>
                      {Number(row.ai_score)} / {Number(row.max_score)}
                    </Badge>
                    {row.status === "pending_review" && (
                      <Badge variant="destructive">Needs review</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {questionMap.get(row.question_id) ?? ""}
                    </span>
                  </div>

                  <CaseResults
                    results={row.case_results}
                    passed={Number(row.cases_passed ?? 0)}
                    total={Number(row.cases_total ?? 0)}
                    judgedBy={row.judged_by}
                    runtimeMs={Number(row.runtime_ms ?? 0)}
                    memoryKb={Number(row.memory_kb ?? 0)}
                    revealHidden
                  />

                  {row.feedback && <p className="text-xs">{row.feedback}</p>}

                  <pre className="max-h-56 overflow-auto rounded-md border bg-muted/30 p-2 font-mono text-[11px] whitespace-pre-wrap">
                    {row.code}
                  </pre>

                  <div className="flex flex-wrap items-end gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Override marks</Label>
                      <Input
                        type="number"
                        min={0}
                        max={Number(row.max_score)}
                        className="h-8 w-28"
                        value={overrides[row.id] ?? String(row.ai_score ?? 0)}
                        onChange={(e) =>
                          setOverrides((prev) => ({ ...prev, [row.id]: e.target.value }))
                        }
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={override.isPending}
                      onClick={() =>
                        override.mutate({
                          id: row.id,
                          ai_score: Number(overrides[row.id] ?? row.ai_score ?? 0),
                        })
                      }
                    >
                      Save score
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theory" className="space-y-4 pt-4">
          {awaiting.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nothing waiting for evaluation right now.
              </CardContent>
            </Card>
          ) : null}

          {awaiting.map((row) => {
            const draft = drafts[row.id] ?? { awarded: "", comment: "" };
            return (
              <Card key={row.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {studentMap.get(row.student_id) ?? "Student"}
                  </CardTitle>
                  <CardDescription>
                    {questionMap.get(row.question_id) ?? "Question"} · out of {row.max_marks} marks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-sm whitespace-pre-wrap">
                    {row.answer}
                  </pre>
                  <div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)_auto] md:items-end">
                    <div className="space-y-2">
                      <Label htmlFor={`marks-${row.id}`}>Marks awarded</Label>
                      <Input
                        id={`marks-${row.id}`}
                        type="number"
                        min={0}
                        max={row.max_marks}
                        value={draft.awarded}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [row.id]: { ...draft, awarded: event.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`comment-${row.id}`}>Feedback</Label>
                      <Input
                        id={`comment-${row.id}`}
                        value={draft.comment}
                        placeholder="What was strong, what to improve"
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [row.id]: { ...draft, comment: event.target.value },
                          }))
                        }
                      />
                    </div>
                    <Button
                      onClick={() =>
                        grade.mutate({
                          id: row.id,
                          awarded: Number(draft.awarded || 0),
                          comment: draft.comment,
                        })
                      }
                      disabled={draft.awarded === "" || grade.isPending}
                    >
                      Save marks
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {done.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recently evaluated</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {done.slice(0, 10).map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <span>{studentMap.get(row.student_id) ?? "Student"}</span>
                    <Badge variant="secondary">
                      {row.awarded ?? 0}/{row.max_marks}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="viva" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Score a practical viva</CardTitle>
              <CardDescription>Pick a rubric, then score each criterion.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Student</Label>
                  <Select value={scoreStudent} onValueChange={setScoreStudent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {(students.data ?? []).map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Rubric</Label>
                  <Select value={scoreRubric} onValueChange={setScoreRubric}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select rubric" />
                    </SelectTrigger>
                    <SelectContent>
                      {(rubrics.data ?? []).map((rubric) => (
                        <SelectItem key={rubric.id} value={rubric.id}>
                          {rubric.name} ({rubric.max_marks})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {activeCriteria.map((criterion) => (
                <div
                  key={criterion.label}
                  className="grid gap-2 md:grid-cols-[minmax(0,1fr)_140px]"
                >
                  <Label className="self-center">
                    {criterion.label}{" "}
                    <span className="text-muted-foreground">/ {criterion.max}</span>
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={criterion.max}
                    value={scoreValues[criterion.label] ?? ""}
                    onChange={(event) =>
                      setScoreValues((prev) => ({ ...prev, [criterion.label]: event.target.value }))
                    }
                  />
                </div>
              ))}

              <div className="space-y-2">
                <Label htmlFor="viva-comment">Comments</Label>
                <Textarea
                  id="viva-comment"
                  rows={3}
                  value={scoreComment}
                  onChange={(event) => setScoreComment(event.target.value)}
                />
              </div>

              <Button
                onClick={() => recordScore.mutate()}
                disabled={!scoreStudent || !scoreRubric || recordScore.isPending}
              >
                Record viva score
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent rubric scores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(rubricScores.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No rubric scores recorded yet.</p>
              ) : null}
              {(rubricScores.data ?? []).slice(0, 12).map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span>{studentMap.get(row.student_id) ?? "Student"}</span>
                  <span className="flex items-center gap-2">
                    <Badge variant="outline">{row.kind}</Badge>
                    <Badge variant="secondary">
                      {row.total}/{row.max_total}
                    </Badge>
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rubrics" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">New rubric</CardTitle>
              <CardDescription>Criteria totals become the rubric maximum.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="rubric-name">Name</Label>
                  <Input
                    id="rubric-name"
                    value={rubricName}
                    onChange={(event) => setRubricName(event.target.value)}
                    placeholder="Practical viva — Python fundamentals"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Applies to</Label>
                  <Select
                    value={rubricKind}
                    onValueChange={(value) => setRubricKind(value as typeof rubricKind)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viva">Practical viva</SelectItem>
                      <SelectItem value="theory">Theory exam</SelectItem>
                      <SelectItem value="programming">Programming exam</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {criteria.map((criterion, index) => (
                <div key={index} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_120px_auto]">
                  <Input
                    value={criterion.label}
                    aria-label={`Criterion ${index + 1} label`}
                    onChange={(event) =>
                      setCriteria((prev) =>
                        prev.map((c, i) => (i === index ? { ...c, label: event.target.value } : c)),
                      )
                    }
                  />
                  <Input
                    type="number"
                    min={1}
                    value={criterion.max}
                    aria-label={`Criterion ${index + 1} maximum`}
                    onChange={(event) =>
                      setCriteria((prev) =>
                        prev.map((c, i) =>
                          i === index ? { ...c, max: Number(event.target.value || 0) } : c,
                        ),
                      )
                    }
                  />
                  <Button
                    variant="ghost"
                    onClick={() => setCriteria((prev) => prev.filter((_, i) => i !== index))}
                  >
                    Remove
                  </Button>
                </div>
              ))}

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setCriteria((prev) => [...prev, { label: "", max: 5 }])}
                >
                  Add criterion
                </Button>
                <Button onClick={() => createRubric.mutate()} disabled={createRubric.isPending}>
                  Save rubric
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Existing rubrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(rubrics.data ?? []).map((rubric) => (
                <div
                  key={rubric.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span>{rubric.name}</span>
                  <span className="flex items-center gap-2">
                    <Badge variant="outline">{rubric.kind}</Badge>
                    <Badge variant="secondary">{rubric.max_marks} marks</Badge>
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
