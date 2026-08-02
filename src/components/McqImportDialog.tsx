/**
 * Paste MCQs written in Notepad, preview what was understood, then import
 * them into the question bank as `mcq` questions.
 */
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, FileUp, Upload } from "lucide-react";

import { MCQ_SAMPLE, parseMcqText } from "@/lib/mcq-import";
import { importMcqQuestions } from "@/lib/tests.functions";
import { formatFormError } from "@/lib/form-errors";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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

type ModuleOption = { id: string; code: string; title: string };

export function McqImportDialog({ modules }: { modules: ModuleOption[] }) {
  const queryClient = useQueryClient();
  const runImport = useServerFn(importMcqQuestions);

  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [moduleId, setModuleId] = useState("none");
  const [bloom, setBloom] = useState("L2");

  const parsed = useMemo(() => parseMcqText(text), [text]);

  const importMutation = useMutation({
    mutationFn: () =>
      runImport({
        data: {
          module_id: moduleId === "none" ? null : moduleId,
          bloom: bloom as "L1" | "L2" | "L3" | "L4" | "L5" | "L6",
          questions: parsed.questions.map((q) => ({
            prompt: q.prompt,
            options: q.options,
            answer: q.answer,
            explanation: q.explanation,
            level: q.level,
            marks: q.marks,
          })),
        },
      }),
    onSuccess: (r) => {
      toast.success(`Imported ${r.imported} MCQ${r.imported === 1 ? "" : "s"}`);
      setText("");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["questions"] });
    },
    onError: (e: unknown) => toast.error(formatFormError(e, "Could not import these questions.")),
  });

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 1_000_000) return toast.error("Keep the file under 1 MB.");
    setText(await file.text());
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" /> Import MCQs
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Import MCQs from Notepad</DialogTitle>
          <DialogDescription>
            Paste your questions below. One block per question, blank line between blocks, star the
            correct option.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/40 p-3">
            <p className="mb-2 text-xs font-medium">Format example</p>
            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted-foreground">
              {MCQ_SAMPLE}
            </pre>
            <p className="mt-2 text-xs text-muted-foreground">
              <code>MARKS</code>, <code>LEVEL</code> (easy/medium/hard) and <code>EXPLANATION</code>{" "}
              are optional and default to 1 / medium / blank. Instead of a star you can write{" "}
              <code>ANSWER: B</code> on its own line.
            </p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="mt-1 h-7 px-2 text-xs"
              onClick={() => setText(MCQ_SAMPLE)}
            >
              Load this example
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Module</Label>
              <Select value={moduleId} onValueChange={setModuleId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No module</SelectItem>
                  {modules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.code} · {m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Bloom level for this batch</Label>
              <Select value={bloom} onValueChange={setBloom}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["L1", "L2", "L3", "L4", "L5", "L6"].map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="mcq-paste">Paste questions</Label>
              <Label
                htmlFor="mcq-file"
                className="flex cursor-pointer items-center gap-1.5 text-xs font-normal text-muted-foreground hover:text-foreground"
              >
                <FileUp className="h-3.5 w-3.5" /> or upload a .txt file
              </Label>
              <input
                id="mcq-file"
                type="file"
                accept=".txt,text/plain"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </div>
            <Textarea
              id="mcq-paste"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              spellCheck={false}
              className="font-mono text-xs"
              placeholder="Q: …"
            />
          </div>

          {(parsed.questions.length > 0 || parsed.issues.length > 0) && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> {parsed.questions.length} ready
                </Badge>
                {parsed.issues.length > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" /> {parsed.issues.length} need fixing
                  </Badge>
                )}
              </div>

              {parsed.issues.length > 0 && (
                <ul className="space-y-1 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs">
                  {parsed.issues.map((issue) => (
                    <li key={`${issue.index}-${issue.line}`}>
                      <span className="font-medium">
                        Block {issue.index} (line {issue.line}):
                      </span>{" "}
                      {issue.message}
                    </li>
                  ))}
                </ul>
              )}

              <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-3">
                {parsed.questions.map((q) => (
                  <div key={`${q.index}-${q.line}`} className="space-y-1 border-b pb-2 last:border-0">
                    <p className="text-sm font-medium">
                      {q.index}. {q.prompt}
                    </p>
                    <ol className="grid gap-0.5 text-xs text-muted-foreground sm:grid-cols-2">
                      {q.options.map((o, i) => (
                        <li
                          key={i}
                          className={
                            o === q.answer ? "font-medium text-foreground" : undefined
                          }
                        >
                          {String.fromCharCode(65 + i)}. {o}
                          {o === q.answer ? "  ✓" : ""}
                        </li>
                      ))}
                    </ol>
                    <p className="text-[11px] text-muted-foreground">
                      {q.marks} mark(s) · {q.level}
                      {q.explanation ? ` · ${q.explanation}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            disabled={importMutation.isPending || parsed.questions.length === 0}
            onClick={() => importMutation.mutate()}
          >
            Import {parsed.questions.length || ""} question
            {parsed.questions.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
