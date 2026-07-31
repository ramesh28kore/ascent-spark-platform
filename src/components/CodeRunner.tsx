import { useState } from "react";
import { Loader2, Play, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { runJavaScript, runPython, type RunResult } from "@/lib/runner/run-code";
import { CodeEditor } from "@/components/CodeEditor";

type Lang = "javascript" | "python";

export type SampleCase = { input: string; expected_output: string };

export type CodingSubmissionView = {
  ai_score: number;
  max_score: number;
  verdict: string;
  feedback: string | null;
  status: string;
  cases_passed: number;
  cases_total: number;
  code: string;
  language: string;
  case_results?: unknown;
  judged_by?: string | null;
  runtime_ms?: number | null;
  memory_kb?: number | null;
};


const STARTER: Record<Lang, string> = {
  javascript: "// Read input with readline(), print with console.log()\n",
  python: "# Read input with input(), print with print()\n",
};

const runIn = (lang: Lang, code: string, stdin: string) =>
  lang === "python" ? runPython(code, stdin) : runJavaScript(code, stdin);

export function CodeRunner({
  value,
  onChange,
  disabled,
  sampleCases = [],
  totalCases = 0,
  marks,
  submission,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  sampleCases?: SampleCase[];
  totalCases?: number;
  marks?: number;
  submission?: CodingSubmissionView | null;
  onSubmit?: (payload: {
    code: string;
    language: Lang;
    cases_passed: number;
    cases_total: number;
  }) => Promise<unknown>;
}) {
  const [lang, setLang] = useState<Lang>("javascript");
  const [stdin, setStdin] = useState(sampleCases[0]?.input ?? "");
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [booting, setBooting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [caseReport, setCaseReport] = useState<string | null>(null);

  const locked = !!submission || !!disabled;

  const run = async () => {
    if (!value.trim()) {
      setResult({ output: "", error: "Write some code first.", ms: 0 });
      return;
    }
    setRunning(true);
    setResult(null);
    try {
      if (lang === "python") setBooting(true);
      setResult(await runIn(lang, value, stdin));
    } finally {
      setBooting(false);
      setRunning(false);
    }
  };

  const submit = async () => {
    if (!onSubmit) return;
    if (!value.trim()) {
      setResult({ output: "", error: "Write some code before submitting.", ms: 0 });
      return;
    }
    setSubmitting(true);
    setCaseReport(null);
    try {
      if (lang === "python") setBooting(true);
      let passed = 0;
      for (const c of sampleCases) {
        const r = await runIn(lang, value, c.input);
        if (!r.error && r.output.trim() === c.expected_output.trim()) passed += 1;
      }
      setBooting(false);
      const total = Math.max(totalCases, sampleCases.length);
      setCaseReport(
        sampleCases.length
          ? `${passed}/${sampleCases.length} sample case(s) passed — sending for grading…`
          : "Sending for grading…",
      );
      await onSubmit({ code: value, language: lang, cases_passed: passed, cases_total: total });
    } finally {
      setBooting(false);
      setSubmitting(false);
      setCaseReport(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={lang} onValueChange={(v) => setLang(v as Lang)} disabled={locked}>
          <SelectTrigger className="h-8 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="javascript">JavaScript</SelectItem>
            <SelectItem value="python">Python</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={run}
          disabled={locked || running || submitting}
          className="gap-1.5"
        >
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          Run
        </Button>
        {onSubmit && (
          <Button
            type="button"
            size="sm"
            onClick={submit}
            disabled={locked || running || submitting}
            className="gap-1.5"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Submit for grading
          </Button>
        )}
        {!value.trim() && !locked && (
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange(STARTER[lang])}>
            Insert starter
          </Button>
        )}
        <span className="text-xs text-muted-foreground">
          Run is a scratchpad — only a submitted answer is scored.
        </span>
      </div>

      {submission ? (
        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>
              {Number(submission.ai_score)} / {Number(submission.max_score)} marks
            </Badge>
            <Badge variant="outline">{submission.verdict}</Badge>
            {submission.status === "pending_review" && (
              <Badge variant="destructive">Awaiting trainer review</Badge>
            )}
          </div>
          {submission.feedback && <p className="text-xs">{submission.feedback}</p>}
          <CaseResults
            results={submission.case_results}
            passed={submission.cases_passed}
            total={submission.cases_total}
            judgedBy={submission.judged_by}
            runtimeMs={submission.runtime_ms}
            memoryKb={submission.memory_kb}
          />

          <pre className="max-h-56 overflow-auto rounded-md border bg-background p-2 font-mono text-xs whitespace-pre-wrap">
            {submission.code}
          </pre>
        </div>
      ) : (
        <>
          <CodeEditor
            value={value}
            onChange={(next) => onChange(next)}
            language={lang}
            height={320}
            readOnly={locked}
          />


          {sampleCases.length > 0 && (
            <div className="rounded-md border p-2">
              <p className="mb-1 text-xs font-medium">
                Sample cases{" "}
                {totalCases > sampleCases.length ? `(${totalCases} total, some hidden)` : ""}
              </p>
              <div className="space-y-1">
                {sampleCases.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setStdin(c.input)}
                    className="w-full rounded border p-2 text-left font-mono text-[11px] hover:bg-accent/40"
                  >
                    <span className="text-muted-foreground">in:</span> {c.input || "(none)"}{" "}
                    <span className="text-muted-foreground">→ out:</span> {c.expected_output}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Input (stdin)</Label>
              <Textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                rows={4}
                spellCheck={false}
                placeholder="Optional test input, one value per line"
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Output</Label>
              <pre className="h-[92px] overflow-auto rounded-md border bg-muted/40 p-2 font-mono text-xs whitespace-pre-wrap">
                {booting
                  ? "Loading the Python runtime (first run only)…"
                  : caseReport
                    ? caseReport
                    : result
                      ? `${result.output}${result.error ? `\n${result.error}` : ""}`.trim() ||
                        "(no output)"
                      : "Run your code to see output here."}
              </pre>
              {result && !caseReport && (
                <p className="text-[11px] text-muted-foreground">
                  {result.error ? "Finished with errors" : "Finished"} in {result.ms} ms
                  {marks ? ` · worth ${marks} mark(s)` : ""}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
