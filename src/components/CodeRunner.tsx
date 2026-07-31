import { useState } from "react";
import { Loader2, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
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

type Lang = "javascript" | "python";

const STARTER: Record<Lang, string> = {
  javascript: "// Read input with readline(), print with console.log()\n",
  python: "# Read input with input(), print with print()\n",
};

export function CodeRunner({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [lang, setLang] = useState<Lang>("javascript");
  const [stdin, setStdin] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [booting, setBooting] = useState(false);

  const run = async () => {
    if (!value.trim()) {
      setResult({ output: "", error: "Write some code first.", ms: 0 });
      return;
    }
    setRunning(true);
    setResult(null);
    try {
      if (lang === "python") setBooting(true);
      const r = lang === "python" ? await runPython(value, stdin) : await runJavaScript(value, stdin);
      setResult(r);
    } finally {
      setBooting(false);
      setRunning(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={lang} onValueChange={(v) => setLang(v as Lang)} disabled={disabled}>
          <SelectTrigger className="h-8 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="javascript">JavaScript</SelectItem>
            <SelectItem value="python">Python</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" size="sm" onClick={run} disabled={disabled || running} className="gap-1.5">
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          Run
        </Button>
        {!value.trim() && !disabled && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange(STARTER[lang])}
          >
            Insert starter
          </Button>
        )}
        <span className="text-xs text-muted-foreground">
          Running is a scratchpad — only the code you submit is graded.
        </span>
      </div>

      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={14}
        spellCheck={false}
        placeholder="Write your solution here…"
        className="font-mono text-xs"
      />

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
              : result
                ? `${result.output}${result.error ? `\n${result.error}` : ""}`.trim() ||
                  "(no output)"
                : "Run your code to see output here."}
          </pre>
          {result && (
            <p className="text-[11px] text-muted-foreground">
              {result.error ? "Finished with errors" : "Finished"} in {result.ms} ms
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
