import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Lock, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type CaseResult = {
  index: number;
  hidden: boolean;
  passed: boolean;
  input?: string;
  expected?: string;
  actual?: string;
  runtime_ms?: number;
  error?: string;
};

/** Defensive parse — older submissions stored `[]` or a JSON string. */
export function parseCaseResults(raw: unknown): CaseResult[] {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item, i) => ({
      index: typeof item.index === "number" ? item.index : i,
      hidden: !!item.hidden,
      passed: !!item.passed,
      input: typeof item.input === "string" ? item.input : undefined,
      expected: typeof item.expected === "string" ? item.expected : undefined,
      actual: typeof item.actual === "string" ? item.actual : undefined,
      runtime_ms: typeof item.runtime_ms === "number" ? item.runtime_ms : undefined,
      error: typeof item.error === "string" ? item.error : undefined,
    }));
}

const lines = (value: string) => value.replace(/\r\n/g, "\n").split("\n").map((l) => l.trimEnd());

function LineDiff({ expected, actual }: { expected: string; actual: string }) {
  const left = lines(expected);
  const right = lines(actual);
  const rows = Math.max(left.length, right.length);

  return (
    <div className="grid grid-cols-2 gap-2">
      {(["Expected", "Your output"] as const).map((heading, column) => (
        <div key={heading} className="min-w-0">
          <p className="mb-1 text-[11px] font-medium text-muted-foreground">{heading}</p>
          <div className="overflow-hidden rounded-md border bg-background">
            {Array.from({ length: rows }).map((_, row) => {
              const value = (column === 0 ? left : right)[row];
              const other = (column === 0 ? right : left)[row];
              const differs = value !== other;
              return (
                <div
                  key={row}
                  className={cn(
                    "flex gap-2 px-2 py-0.5 font-mono text-[11px] whitespace-pre-wrap break-all",
                    differs && "bg-destructive/10 text-destructive",
                  )}
                >
                  <span className="w-4 shrink-0 select-none text-right text-muted-foreground/60">
                    {row + 1}
                  </span>
                  <span className="min-w-0 flex-1">{value ?? ""}</span>
                </div>
              );
            })}
            {rows === 0 && (
              <p className="px-2 py-1 font-mono text-[11px] text-muted-foreground">(empty)</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function CaseRow({ result, revealHidden }: { result: CaseResult; revealHidden: boolean }) {
  const redacted = result.hidden && !revealHidden;
  const [open, setOpen] = useState(!result.passed && !redacted);
  const expandable = !redacted;

  return (
    <div className="rounded-md border">
      <button
        type="button"
        disabled={!expandable}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs",
          expandable && "hover:bg-accent/40",
        )}
      >
        {expandable ? (
          open ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )
        ) : (
          <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        {result.passed ? (
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
        ) : (
          <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
        )}
        <span className="font-medium">
          {result.hidden ? "Hidden case" : `Case ${result.index + 1}`}
        </span>
        <span className={cn(result.passed ? "text-emerald-600" : "text-destructive")}>
          {result.passed ? "Passed" : "Failed"}
        </span>
        {typeof result.runtime_ms === "number" && result.runtime_ms > 0 && (
          <span className="ml-auto text-[11px] text-muted-foreground">{result.runtime_ms} ms</span>
        )}
      </button>

      {open && expandable && (
        <div className="space-y-2 border-t p-2">
          <div>
            <p className="mb-1 text-[11px] font-medium text-muted-foreground">Input (stdin)</p>
            <pre className="max-h-28 overflow-auto rounded-md border bg-background p-2 font-mono text-[11px] whitespace-pre-wrap">
              {result.input?.length ? result.input : "(none)"}
            </pre>
          </div>
          {result.error ? (
            <div>
              <p className="mb-1 text-[11px] font-medium text-muted-foreground">Error</p>
              <pre className="max-h-40 overflow-auto rounded-md border border-destructive/40 bg-destructive/5 p-2 font-mono text-[11px] whitespace-pre-wrap text-destructive">
                {result.error}
              </pre>
            </div>
          ) : (
            <LineDiff expected={result.expected ?? ""} actual={result.actual ?? ""} />
          )}
        </div>
      )}
    </div>
  );
}

export function CaseResults({
  results,
  passed,
  total,
  judgedBy,
  runtimeMs,
  memoryKb,
  revealHidden = false,
}: {
  results: unknown;
  passed: number;
  total: number;
  judgedBy?: string | null;
  runtimeMs?: number | null;
  memoryKb?: number | null;
  revealHidden?: boolean;
}) {
  const parsed = parseCaseResults(results);

  const summary = [
    `${passed}/${total} case(s) passed`,
    judgedBy === "sandbox" ? "judged in sandbox" : judgedBy === "ai" ? "AI reviewed" : null,
    runtimeMs ? `${runtimeMs} ms` : null,
    memoryKb ? `${(memoryKb / 1024).toFixed(1)} MB` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  if (parsed.length === 0) {
    return <p className="text-xs text-muted-foreground">{summary}</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={passed === total ? "default" : "outline"}>Test case results</Badge>
        <span className="text-xs text-muted-foreground">{summary}</span>
      </div>
      <div className="space-y-1.5">
        {parsed.map((result) => (
          <CaseRow key={result.index} result={result} revealHidden={revealHidden} />
        ))}
      </div>
    </div>
  );
}
