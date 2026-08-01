import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Play, Save, Trash2 } from "lucide-react";

import { CodeEditor } from "@/components/CodeEditor";
import { runCodeRemote } from "@/lib/judge.functions";
import { deleteSnippet, listSnippets, saveSnippet } from "@/lib/snippets.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/playground")({
  head: () => ({
    meta: [
      { title: "Python playground — CRT Training Console" },
      {
        name: "description",
        content:
          "Write and run Python or JavaScript in a sandboxed judge, with saved snippets for revision.",
      },
      { property: "og:title", content: "Python playground — CRT Training Console" },
      {
        property: "og:description",
        content: "Sandboxed Python playground with saved snippets for CRT practice.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlaygroundPage,
});

const STARTER = `# Read input with input(), print your answer.
name = input().strip() or "world"
print(f"Hello, {name}!")
`;

function PlaygroundPage() {
  const queryClient = useQueryClient();
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(STARTER);
  const [stdin, setStdin] = useState("CRT");
  const [title, setTitle] = useState("");
  const [snippetId, setSnippetId] = useState<string | undefined>(undefined);

  const runFn = useServerFn(runCodeRemote);
  const saveFn = useServerFn(saveSnippet);
  const removeFn = useServerFn(deleteSnippet);
  const listFn = useServerFn(listSnippets);

  const snippets = useQuery({ queryKey: ["snippets"], queryFn: () => listFn() });

  const run = useMutation({
    mutationFn: () =>
      runFn({ data: { language: language as "python" | "javascript", code, stdin } }),
  });

  const save = useMutation({
    mutationFn: () =>
      saveFn({ data: { id: snippetId, title: title.trim() || "Untitled snippet", language, code } }),
    onSuccess: (res) => {
      setSnippetId(res.id);
      toast.success("Snippet saved");
      queryClient.invalidateQueries({ queryKey: ["snippets"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Snippet deleted");
      queryClient.invalidateQueries({ queryKey: ["snippets"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const result = run.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Playground</h1>
        <p className="text-sm text-muted-foreground">
          Practise freely. Code runs in an isolated sandbox on the server, exactly like the exam
          judge.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-base">Editor</CardTitle>
              <CardDescription>Monaco editor with syntax highlighting.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="python">Python 3</SelectItem>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => run.mutate()} disabled={run.isPending}>
                {run.isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Play className="mr-2 size-4" />
                )}
                Run
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <CodeEditor value={code} onChange={setCode} language={language} height={420} />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="stdin">Standard input</Label>
                <Textarea
                  id="stdin"
                  rows={5}
                  value={stdin}
                  onChange={(event) => setStdin(event.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label>Output</Label>
                <pre className="h-[118px] overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-xs whitespace-pre-wrap">
                  {run.isPending
                    ? "Running…"
                    : result
                      ? result.error
                        ? result.error
                        : `${result.stdout}${result.stderr ? `\n${result.stderr}` : ""}`.trim() ||
                          "(no output)"
                      : "Press Run to execute your code."}
                </pre>
              </div>
            </div>

            {result && !result.error ? (
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">{result.runtime_ms} ms</Badge>
                <Badge variant="secondary">{result.memory_kb} KB</Badge>
                {result.timed_out ? <Badge variant="destructive">timed out</Badge> : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saved snippets</CardTitle>
            <CardDescription>Keep reusable solutions for revision.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="snippet-title">Title</Label>
              <Input
                id="snippet-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Two-sum with hashmap"
              />
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => save.mutate()}
                disabled={save.isPending}
              >
                <Save className="mr-2 size-4" />
                {snippetId ? "Update snippet" : "Save snippet"}
              </Button>
              {snippetId ? (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setSnippetId(undefined);
                    setTitle("");
                    setCode(STARTER);
                  }}
                >
                  New snippet
                </Button>
              ) : null}
            </div>

            <div className="space-y-2">
              {(snippets.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No snippets saved yet.</p>
              ) : null}
              {(snippets.data ?? []).map((snippet) => (
                <div
                  key={snippet.id}
                  className="flex items-center justify-between gap-2 rounded-md border p-2"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => {
                      setSnippetId(snippet.id);
                      setTitle(snippet.title);
                      setLanguage(snippet.language);
                      setCode(snippet.code);
                    }}
                  >
                    <p className="truncate text-sm font-medium">{snippet.title}</p>
                    <p className="text-xs text-muted-foreground">{snippet.language}</p>
                  </button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => remove.mutate(snippet.id)}
                    aria-label={`Delete ${snippet.title}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
