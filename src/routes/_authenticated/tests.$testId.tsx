import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Timer } from "lucide-react";

import { getTestPaper, startAttempt, submitAttempt } from "@/lib/tests.functions";
import { saveTheoryAnswer } from "@/lib/exams.functions";
import { gradeCodingSubmission } from "@/lib/coding.functions";

import { meQuery } from "@/lib/crt-queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CodeRunner } from "@/components/CodeRunner";
import { Leaderboard } from "@/components/Leaderboard";


export const Route = createFileRoute("/_authenticated/tests/$testId")({
  head: () => ({
    meta: [
      { title: "Take test — CRT Training Console" },
      {
        name: "description",
        content: "Timed CRT online test with per-student question shuffling and automatic scoring.",
      },
      { property: "og:title", content: "Take test — CRT Training Console" },
      { property: "og:description", content: "Attempt your scheduled CRT test." },
    ],
  }),
  component: TestRunner,
});

function TestRunner() {
  const { testId } = Route.useParams();
  const me = useQuery(meQuery);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchPaper = useServerFn(getTestPaper);
  const begin = useServerFn(startAttempt);
  const submit = useServerFn(submitAttempt);

  const paper = useQuery({
    queryKey: ["test-paper", testId],
    queryFn: () => fetchPaper({ data: { test_id: testId } }),
  });

  const [responses, setResponses] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState<number | null>(null);
  const [blurCount, setBlurCount] = useState(0);
  const started = useRef(false);

  const attempt = paper.data?.attempt ?? null;
  const submitted = !!attempt?.submitted_at;
  const isStaff = !!me.data?.isStaff;

  const gradeCode = useServerFn(gradeCodingSubmission);
  const gradeCoding = useMutation({
    mutationFn: (payload: {
      test_id: string;
      question_id: string;
      code: string;
      language: "javascript" | "python";
      cases_passed: number;
      cases_total: number;
    }) => gradeCode({ data: payload }),
    onSuccess: (r) => {
      toast.success(`Graded — ${r.score}/${r.max_score} (${r.verdict})`);
      queryClient.invalidateQueries({ queryKey: ["test-paper", testId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submissionFor = (questionId: string) => {
    const row = (paper.data?.codingSubmissions ?? []).find(
      (s) => s.question_id === questionId,
    );
    return row
      ? {
          ai_score: Number(row.ai_score ?? 0),
          max_score: Number(row.max_score ?? 0),
          verdict: String(row.verdict ?? ""),
          feedback: row.feedback ?? null,
          status: String(row.status ?? "graded"),
          cases_passed: Number(row.cases_passed ?? 0),
          cases_total: Number(row.cases_total ?? 0),
          code: String(row.code ?? ""),
          language: String(row.language ?? ""),
        }
      : null;
  };

  const saveTheory = useServerFn(saveTheoryAnswer);

  const send = useMutation({
    mutationFn: async () => {
      // Written answers need a human evaluator, so persist them before auto-grading.
      const written = (paper.data?.paper ?? []).filter(
        (q) => q.qtype === "descriptive" && (responses[q.question_id] ?? "").trim().length > 0,
      );
      for (const question of written) {
        await saveTheory({
          data: {
            test_id: testId,
            question_id: question.question_id,
            answer: responses[question.question_id],
            max_marks: question.marks ?? 1,
          },
        }).catch(() => undefined);
      }
      return submit({ data: { test_id: testId, responses, blur_count: blurCount } });
    },
    onSuccess: (r) => {
      toast.success(`Submitted — ${r.score}/${r.maxScore}`);
      queryClient.invalidateQueries({ queryKey: ["test-paper", testId] });
      queryClient.invalidateQueries({ queryKey: ["tests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });



  // Start the attempt once for students.
  useEffect(() => {
    if (isStaff || submitted || started.current || !paper.data) return;
    started.current = true;
    begin({ data: { test_id: testId } }).catch(() => undefined);
  }, [isStaff, submitted, paper.data, begin, testId]);

  // Countdown from the attempt start.
  useEffect(() => {
    if (!paper.data || submitted || isStaff) return;
    const startMs = attempt?.started_at ? new Date(attempt.started_at).getTime() : Date.now();
    const endMs = startMs + paper.data.test.duration_min * 60_000;
    const tick = () => setRemaining(Math.max(0, Math.round((endMs - Date.now()) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [paper.data, attempt?.started_at, submitted, isStaff]);

  // Tab-switch proctoring signal.
  useEffect(() => {
    if (submitted || isStaff) return;
    const onBlur = () => setBlurCount((c) => c + 1);
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, [submitted, isStaff]);

  useEffect(() => {
    if (remaining === 0 && !submitted && !isStaff && !send.isPending) send.mutate();
  }, [remaining, submitted, isStaff]);

  const questions = paper.data?.paper ?? [];
  const answered = useMemo(
    () => questions.filter((q) => responses[q.question_id]).length,
    [questions, responses],
  );

  if (paper.isLoading) return <Skeleton className="h-64 w-full" />;
  if (paper.isError)
    return (
      <p className="text-sm text-destructive">
        {(paper.error as Error).message || "Unable to load this test."}
      </p>
    );

  const mmss =
    remaining === null
      ? "--:--"
      : `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {paper.data?.test.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {questions.length} questions · {paper.data?.test.duration_min} minutes
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isStaff && !submitted && (
            <Badge variant={remaining !== null && remaining < 120 ? "destructive" : "secondary"} className="gap-1">
              <Timer className="h-3.5 w-3.5" /> {mmss}
            </Badge>
          )}
          {blurCount > 0 && !submitted && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> {blurCount} tab switch(es)
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate({ to: "/tests" })}>
            Back
          </Button>
        </div>
      </div>

      {submitted && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Result</CardTitle>
            <CardDescription>Auto-evaluated on submission.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-display text-3xl">
              {Number(attempt?.score ?? 0)} / {Number(attempt?.max_score ?? 0)}
            </p>
            <Progress
              value={
                Number(attempt?.max_score ?? 0)
                  ? (Number(attempt?.score ?? 0) / Number(attempt?.max_score ?? 1)) * 100
                  : 0
              }
              className="h-2"
            />
          </CardContent>
        </Card>
      )}

      {!submitted && !isStaff && (
        <Progress value={(answered / Math.max(1, questions.length)) * 100} className="h-2" />
      )}

      <div className="space-y-4">
        {questions.map((q, idx) => (
          <Card key={q.question_id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium leading-relaxed">
                {idx + 1}. {q.prompt}
              </CardTitle>
              <CardDescription>
                {q.marks} mark(s) · {q.level}
                {q.qtype && q.qtype !== "mcq" ? ` · ${q.qtype === "coding" ? "Coding" : "Written"}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {q.qtype === "coding" ? (
                <div className="space-y-2">
                  <CodeRunner
                    value={
                      responses[q.question_id] ??
                      (submitted
                        ? String((attempt?.responses as Record<string, string>)?.[q.question_id] ?? "")
                        : "")
                    }
                    onChange={(v) => setResponses((r) => ({ ...r, [q.question_id]: v }))}
                    disabled={submitted || isStaff}
                    marks={q.marks}
                    sampleCases={q.sample_cases ?? []}
                    totalCases={q.total_cases ?? 0}
                    submission={submissionFor(q.question_id)}
                    onSubmit={
                      isStaff
                        ? undefined
                        : (payload) =>
                            gradeCoding.mutateAsync({
                              test_id: testId,
                              question_id: q.question_id,
                              ...payload,
                            })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Submitting locks this question and sends your code for AI grading.
                  </p>
                </div>
              ) : q.qtype && q.qtype !== "mcq" ? (

                <div className="space-y-2">
                  <Textarea
                    value={
                      responses[q.question_id] ??
                      (submitted
                        ? String((attempt?.responses as Record<string, string>)?.[q.question_id] ?? "")
                        : "")
                    }
                    onChange={(e) =>
                      setResponses((r) => ({ ...r, [q.question_id]: e.target.value }))
                    }
                    disabled={submitted || isStaff}
                    rows={6}
                    spellCheck={false}
                    placeholder="Write your answer here…"
                  />
                  <p className="text-xs text-muted-foreground">
                    Written answers are reviewed by your trainer.
                  </p>
                </div>
              ) : (

              <RadioGroup
                value={responses[q.question_id] ?? (submitted ? String((attempt?.responses as Record<string, string>)?.[q.question_id] ?? "") : "")}
                onValueChange={(v) => setResponses((r) => ({ ...r, [q.question_id]: v }))}
                disabled={submitted || isStaff}
                className="space-y-2"
              >
                {(q.options ?? []).map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <RadioGroupItem value={String(opt)} id={`${q.question_id}-${i}`} />
                    <Label htmlFor={`${q.question_id}-${i}`} className="font-normal">
                      {String(opt)}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {!submitted && !isStaff && (
        <Button onClick={() => send.mutate()} disabled={send.isPending}>
          Submit test
        </Button>
      )}

      {paper.data?.test.leaderboard && (submitted || isStaff) ? (
        <Leaderboard testId={testId} />
      ) : null}

    </div>
  );
}
