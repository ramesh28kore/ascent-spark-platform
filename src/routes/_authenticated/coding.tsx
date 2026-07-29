import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { codingQuery, modulesQuery } from "@/lib/crt-queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/coding")({
  head: () => ({
    meta: [
      { title: "Coding library — CRT Training Console" },
      {
        name: "description",
        content:
          "Python coding practice ladder: problem, approach, code, expected output, complexity and follow-ups.",
      },
      { property: "og:title", content: "Coding library — CRT Training Console" },
      { property: "og:description", content: "Pattern-tagged Python problems for placement prep." },
    ],
  }),
  component: CodingPage,
});

function CodingPage() {
  const problems = useQuery(codingQuery);
  const modules = useQuery(modulesQuery);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("all");

  const list = useMemo(
    () =>
      (problems.data ?? []).filter(
        (p) =>
          (level === "all" || p.level === level) &&
          `${p.title} ${p.pattern ?? ""}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [problems.data, search, level],
  );

  if (problems.isLoading) return <Skeleton className="h-96 w-full" />;

  const moduleName = (id: string | null) => {
    const m = (modules.data?.modules ?? []).find((x) => x.id === id);
    return m ? m.code : null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Coding practice library</h1>
        <p className="text-sm text-muted-foreground">
          Every problem follows Problem → Approach → Python → Output → Complexity → Follow-ups.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search title or pattern"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxLength={60}
          className="max-w-sm"
        />
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Accordion type="single" collapsible className="space-y-3">
        {list.map((p) => (
          <AccordionItem key={p.id} value={p.id} className="rounded-lg border px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex w-full items-center justify-between gap-4 pr-3">
                <span className="font-display text-sm font-semibold">{p.title}</span>
                <span className="flex shrink-0 gap-1.5">
                  {moduleName(p.module_id) && (
                    <Badge variant="outline">{moduleName(p.module_id)}</Badge>
                  )}
                  {p.pattern && <Badge variant="secondary">{p.pattern}</Badge>}
                  <Badge>{p.level}</Badge>
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-4 pb-4 lg:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-sm">Problem</CardTitle>
                  </CardHeader>
                  <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {p.problem}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-sm">Approach</CardTitle>
                    <CardDescription>{p.complexity}</CardDescription>
                  </CardHeader>
                  <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {p.approach}
                  </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-sm">Python solution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="overflow-x-auto rounded-md bg-primary p-4 text-xs leading-relaxed text-primary-foreground">
                      <code>{p.code}</code>
                    </pre>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-sm">Expected output</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="overflow-x-auto rounded-md border p-3 text-xs">
                      <code>{p.expected_output}</code>
                    </pre>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-sm">Interview follow-ups</CardTitle>
                  </CardHeader>
                  <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {p.follow_ups}
                  </CardContent>
                </Card>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      {list.length === 0 && (
        <p className="text-sm text-muted-foreground">No problems match this filter.</p>
      )}
    </div>
  );
}
