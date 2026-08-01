import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Lock,
  MessageSquare,
  Play,
  Send,
  Star,
  XCircle,
} from "lucide-react";

import { bookmarksQuery, problemQuery } from "@/lib/crt-queries";
import { toggleBookmark } from "@/lib/leetcode.functions";
import { postProblemComment, runProblem, submitProblem } from "@/lib/problems.functions";
import {
  LANGUAGES,
  LEVEL_TONE,
  VERDICT_TONE,
  draftKey,
  parseExamples,
  parseHints,
  starterFor,
  type ProblemLanguage,
} from "@/lib/problems-shared";
import { templateFor } from "@/lib/code-templates";
import { useCodeSnapshots } from "@/hooks/useCodeSnapshots";
import { CodeHistory } from "@/components/CodeHistory";
import { CaseResults, type CaseResult } from "@/components/CaseResults";
import { CodeEditor } from "@/components/CodeEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/problems/$slug")({
  head: ({ params }) => {
    const name = params.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      meta: [
        { title: `${name} — CRT Problem` },
        {
          name: "description",
          content: `Solve ${name} in the browser editor, run the sample cases and submit for a judged verdict.`,
        },
        { property: "og:title", content: `${name} — CRT Problem` },
        { property: "og:description", content: `Coding practice workspace for ${name}.` },
      ],
    };
  },
  component: ProblemWorkspace,
});

type RunState = {
  results: CaseResult[];
  passed: number;
  total: number;
  runtime_ms: number;
  memory_kb: number;
  error: string | null;
  stdout?: string;
  stderr?: string;
  verdict?: string;
  label: string;
};

function ProblemWorkspace() {
  const { slug } = Route.useParams();
  const detail = useQuery(problemQuery(slug));
  const queryClient = useQueryClient();
  const run = useServerFn(runProblem);
  const submit = useServerFn(submitProblem);
  const comment = useServerFn(postProblemComment);
  const bookmarks = useQuery(bookmarksQuery);
  const bookmark = useServerFn(toggleBookmark);

  const [language, setLanguage] = useState<ProblemLanguage>("python");
  const [code, setCode] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [result, setResult] = useState<RunState | null>(null);
  const [bottomTab, setBottomTab] = useState("testcase");
  const [body, setBody] = useState("");
  const [revealedHints, setRevealedHints] = useState(0);

  const problem = detail.data?.problem;

  const snapshots = useCodeSnapshots({
    scope: { scope_kind: "practice", problem_id: problem?.id ?? null },
    language,
    code,
    enabled: !!problem,
  });

  // Restore the per-problem, per-language buffer: server snapshot wins, then
  // the local draft, then the language template / problem starter.
  useEffect(() => {
    if (!problem || !snapshots.resumeReady) return;
    const local =
      typeof window !== "undefined" ? window.localStorage.getItem(draftKey(slug, language)) : null;
    setCode(snapshots.resumed?.code ?? local ?? starterFor(problem.starter_code, language));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem?.id, slug, language, snapshots.resumeReady, snapshots.resumed?.id]);

  useEffect(() => {
    if (!problem || !code) return;
    const id = window.setTimeout(
      () => window.localStorage.setItem(draftKey(slug, language), code),
      400,
    );
    return () => window.clearTimeout(id);
  }, [code, slug, language, problem]);

  const examples = useMemo(() => parseExamples(problem?.examples), [problem?.examples]);
  const hints = useMemo(() => parseHints(problem?.hints), [problem?.hints]);
  const samples = problem?.test_cases ?? [];

  const runMutation = useMutation({
    mutationFn: () =>
      run({
        data: {
          problem_id: problem!.id,
          language,
          code,
          ...(useCustom ? { stdin: customInput } : {}),
        },
      }),
    onSuccess: (data) => {
      setResult({
        results: (data.results ?? []) as CaseResult[],
        passed: data.passed,
        total: data.total,
        runtime_ms: data.runtime_ms,
        memory_kb: data.memory_kb,
        error: data.error,
        stdout: data.stdout,
        stderr: data.stderr,
        label: useCustom ? "Custom run" : "Sample run",
      });
      setBottomTab("result");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitMutation = useMutation({
    mutationFn: () => submit({ data: { problem_id: problem!.id, language, code } }),
    onSuccess: (data) => {
      setResult({
        results: data.results as CaseResult[],
        passed: data.passed,
        total: data.total,
        runtime_ms: data.runtime_ms,
        memory_kb: data.memory_kb,
        error: null,
        verdict: data.verdict,
        label: "Submission",
      });
      setBottomTab("result");
      if (data.verdict === "accepted") toast.success("Accepted!");
      else toast.error(data.verdict);
      queryClient.invalidateQueries({ queryKey: ["problem", slug] });
      queryClient.invalidateQueries({ queryKey: ["problems"] });
      queryClient.invalidateQueries({ queryKey: ["problem-profile"] });
      queryClient.invalidateQueries({ queryKey: ["practice"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bookmarkMutation = useMutation({
    mutationFn: (on: boolean) => bookmark({ data: { problem_id: problem!.id, on } }),
    onSuccess: (res) => {
      toast.success(res.bookmarked ? "Added to favourites" : "Removed from favourites");
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const commentMutation = useMutation({
    mutationFn: () => comment({ data: { problem_id: problem!.id, body: body.trim() } }),
    onSuccess: () => {
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["problem", slug] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (detail.isPending && !detail.isError) return <Skeleton className="h-[70vh] w-full" />;
  if (!problem || !problem.statement)
    return (
      <Card>
        <CardContent className="space-y-3 p-6">
          <h1 className="font-display text-xl font-semibold">
            {problem?.title ?? "Problem unavailable"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {detail.isError
              ? "This problem is not available in the workspace — it has no statement or test cases yet."
              : "This problem has no statement or test cases yet, so it cannot be attempted here."}
          </p>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/problems">
              <ArrowLeft className="size-4" /> Back to problem set
            </Link>
          </Button>
        </CardContent>
      </Card>
    );



  const isFavourite = (bookmarks.data?.problemIds ?? []).includes(problem.id);
  const submissions = detail.data?.submissions ?? [];
  const posts = detail.data?.posts ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link to="/problems">
            <ArrowLeft className="size-4" /> Problem set
          </Link>
        </Button>
        <h1 className="font-display text-xl font-bold tracking-tight">{problem.title}</h1>
        <span className={`text-sm font-medium capitalize ${LEVEL_TONE[problem.level]}`}>
          {problem.level}
        </span>
        {detail.data?.solved ? (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="size-3.5 text-emerald-500" /> Solved
          </Badge>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          disabled={bookmarkMutation.isPending}
          onClick={() => bookmarkMutation.mutate(!isFavourite)}
        >
          <Star className={`size-4 ${isFavourite ? "fill-amber-400 text-amber-400" : ""}`} />
          {isFavourite ? "Favourited" : "Favourite"}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ------------------------------------------------------- left pane */}
        <Card className="min-h-[60vh]">
          <CardContent className="p-0">
            <Tabs defaultValue="description">
              <TabsList className="m-3 flex-wrap">
                <TabsTrigger value="description">Description</TabsTrigger>
                <TabsTrigger value="hints">Hints</TabsTrigger>
                <TabsTrigger value="solution">Solution</TabsTrigger>
                <TabsTrigger value="submissions">Submissions</TabsTrigger>
                <TabsTrigger value="discuss">Discuss</TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[58vh]">
                <TabsContent value="description" className="space-y-4 px-4 pb-6">
                  <div className="flex flex-wrap gap-1.5">
                    {problem.company ? <Badge variant="outline">{problem.company}</Badge> : null}
                    {problem.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="font-normal">
                        {t}
                      </Badge>
                    ))}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{problem.statement}</p>

                  {examples.map((ex, i) => (
                    <div key={i} className="rounded-md border p-3">
                      <p className="mb-2 text-xs font-semibold">Example {i + 1}</p>
                      <p className="text-xs text-muted-foreground">Input</p>
                      <pre className="mb-2 whitespace-pre-wrap rounded bg-muted p-2 font-mono text-xs">
                        {ex.input}
                      </pre>
                      <p className="text-xs text-muted-foreground">Output</p>
                      <pre className="whitespace-pre-wrap rounded bg-muted p-2 font-mono text-xs">
                        {ex.output}
                      </pre>
                      {ex.explanation ? (
                        <p className="mt-2 text-xs text-muted-foreground">{ex.explanation}</p>
                      ) : null}
                    </div>
                  ))}

                  {problem.constraints ? (
                    <div>
                      <p className="mb-1 text-xs font-semibold">Constraints</p>
                      <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                        {problem.constraints}
                      </pre>
                    </div>
                  ) : null}

                  <p className="text-xs text-muted-foreground">
                    {samples.length} sample case{samples.length === 1 ? "" : "s"} ·{" "}
                    {problem.hidden_count} hidden case{problem.hidden_count === 1 ? "" : "s"}
                  </p>
                </TabsContent>

                <TabsContent value="hints" className="space-y-3 px-4 pb-6">
                  {hints.length === 0 && (
                    <p className="text-sm text-muted-foreground">No hints for this problem.</p>
                  )}
                  {hints.slice(0, revealedHints).map((h, i) => (
                    <div key={i} className="rounded-md border p-3 text-sm">
                      <span className="mr-2 text-xs font-semibold text-muted-foreground">
                        Hint {i + 1}
                      </span>
                      {h}
                    </div>
                  ))}
                  {revealedHints < hints.length && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRevealedHints((n) => n + 1)}
                    >
                      Reveal hint {revealedHints + 1}
                    </Button>
                  )}
                </TabsContent>

                <TabsContent value="solution" className="px-4 pb-6">
                  {problem.solution_locked ? (
                    <div className="flex items-start gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                      <Lock className="mt-0.5 size-4 shrink-0" />
                      The editorial unlocks after you solve this problem or make three submissions.
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {problem.solution || "No editorial has been written yet."}
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="submissions" className="space-y-2 px-4 pb-6">
                  {submissions.length === 0 && (
                    <p className="text-sm text-muted-foreground">No submissions yet.</p>
                  )}
                  {submissions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setLanguage(s.language as ProblemLanguage);
                        setCode(s.code);
                        toast.info("Loaded that submission into the editor");
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm hover:bg-accent/40"
                    >
                      <span className={`font-medium capitalize ${VERDICT_TONE[s.verdict] ?? ""}`}>
                        {s.verdict}
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {s.cases_passed}/{s.cases_total} · {s.runtime_ms} ms · {s.language} ·{" "}
                        {new Date(s.created_at).toLocaleString()}
                      </span>
                    </button>
                  ))}
                </TabsContent>

                <TabsContent value="discuss" className="space-y-3 px-4 pb-6">
                  <div className="space-y-2">
                    <Textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Share an approach or ask a question…"
                      maxLength={2000}
                      rows={3}
                    />
                    <Button
                      size="sm"
                      className="gap-2"
                      disabled={body.trim().length < 2 || commentMutation.isPending}
                      onClick={() => commentMutation.mutate()}
                    >
                      <MessageSquare className="size-4" /> Post
                    </Button>
                  </div>
                  {posts.map((p) => (
                    <div key={p.id} className="rounded-md border p-3">
                      <p className="text-xs font-medium">
                        {(p.profiles as { full_name?: string } | null)?.full_name ?? "Student"}
                        <span className="ml-2 font-normal text-muted-foreground">
                          {new Date(p.created_at).toLocaleString()}
                        </span>
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{p.body}</p>
                    </div>
                  ))}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </CardContent>
        </Card>

        {/* ------------------------------------------------------ right pane */}
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 p-3">
              <div className="flex items-center justify-between gap-2">
                <Select value={language} onValueChange={(v) => setLanguage(v as ProblemLanguage)}>
                  <SelectTrigger className="h-8 w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2">
                  <CodeHistory
                    snapshots={snapshots.snapshots}
                    loading={snapshots.isLoadingHistory}
                    currentCode={code}
                    onRestore={(snap) => {
                      snapshots.snapshotNow("manual", code);
                      setLanguage(snap.language as ProblemLanguage);
                      setCode(snap.code);
                      toast.success("Restored an earlier version");
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      if (!window.confirm("Reset the editor to the starter template?")) return;
                      snapshots.snapshotNow("manual", code);
                      setCode(
                        problem.starter_code
                          ? starterFor(problem.starter_code, language)
                          : templateFor(language),
                      );
                    }}
                  >
                    <RotateCcw className="size-4" />
                    Reset
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={runMutation.isPending || !code.trim()}
                    onClick={() => runMutation.mutate()}
                  >
                    {runMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Play className="size-4" />
                    )}
                    Run
                  </Button>
                  <Button
                    size="sm"
                    className="gap-2"
                    disabled={submitMutation.isPending || !code.trim()}
                    onClick={() => submitMutation.mutate()}
                  >
                    {submitMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    Submit
                  </Button>
                </div>
              </div>
              <CodeEditor value={code} onChange={setCode} language={language} height={420} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <Tabs value={bottomTab} onValueChange={setBottomTab}>
                <TabsList>
                  <TabsTrigger value="testcase">Testcase</TabsTrigger>
                  <TabsTrigger value="result">Result</TabsTrigger>
                </TabsList>

                <TabsContent value="testcase" className="space-y-3 pt-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={useCustom ? "outline" : "secondary"}
                      size="sm"
                      onClick={() => setUseCustom(false)}
                    >
                      Sample cases ({samples.length})
                    </Button>
                    <Button
                      variant={useCustom ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setUseCustom(true)}
                    >
                      Custom input
                    </Button>
                  </div>
                  {useCustom ? (
                    <Textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      rows={5}
                      className="font-mono text-xs"
                      placeholder="stdin passed to your program"
                    />
                  ) : (
                    <div className="space-y-2">
                      {samples.map((c, i) => (
                        <div key={i} className="rounded-md border p-2">
                          <p className="text-[11px] font-medium text-muted-foreground">
                            Case {i + 1} input
                          </p>
                          <pre className="whitespace-pre-wrap font-mono text-xs">{c.input}</pre>
                          <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                            Expected
                          </p>
                          <pre className="whitespace-pre-wrap font-mono text-xs">
                            {c.expected_output}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="result" className="space-y-3 pt-3">
                  {!result && (
                    <p className="text-sm text-muted-foreground">
                      Run or submit your code to see verdicts here.
                    </p>
                  )}
                  {result && (
                    <>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-xs text-muted-foreground">{result.label}</span>
                        {result.verdict ? (
                          <span
                            className={`flex items-center gap-1 font-semibold capitalize ${VERDICT_TONE[result.verdict] ?? ""}`}
                          >
                            {result.verdict === "accepted" ? (
                              <CheckCircle2 className="size-4" />
                            ) : (
                              <XCircle className="size-4" />
                            )}
                            {result.verdict}
                          </span>
                        ) : null}
                        <Badge variant="outline">{result.runtime_ms} ms</Badge>
                        <Badge variant="outline">{result.memory_kb} KB</Badge>
                      </div>
                      {result.error ? (
                        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
                          {result.error}
                        </p>
                      ) : null}
                      {result.stdout || result.stderr ? (
                        <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md border p-2 font-mono text-xs">
                          {result.stdout}
                          {result.stderr}
                        </pre>
                      ) : null}
                      {result.total > 0 && (
                        <CaseResults
                          results={result.results}
                          passed={result.passed}
                          total={result.total}
                          judgedBy="sandbox"
                          runtimeMs={result.runtime_ms}
                          memoryKb={result.memory_kb}
                        />
                      )}
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
