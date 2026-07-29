import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Clock } from "lucide-react";

import { setTopicCompleted } from "@/lib/crt.functions";
import { meQuery, modulesQuery } from "@/lib/crt-queries";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/modules")({
  head: () => ({
    meta: [
      { title: "Module planner — CRT Training Console" },
      {
        name: "description",
        content: "M1–M7 CRT syllabus planner with hours, topics, deliverables and completion state.",
      },
      { property: "og:title", content: "Module planner — CRT Training Console" },
      { property: "og:description", content: "Plan and track the 60–75 hour CRT syllabus." },
    ],
  }),
  component: ModulesPage,
});

function ModulesPage() {
  const me = useQuery(meQuery);
  const modules = useQuery(modulesQuery);
  const queryClient = useQueryClient();
  const toggle = useServerFn(setTopicCompleted);

  const mutation = useMutation({
    mutationFn: (vars: { id: string; completed: boolean }) => toggle({ data: vars }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["modules"] }),
    onError: () => toast.error("Could not update topic"),
  });

  if (modules.isLoading) return <Skeleton className="h-96 w-full" />;

  const isTrainer = me.data?.isTrainer ?? false;
  const mods = modules.data?.modules ?? [];
  const topics = modules.data?.topics ?? [];
  const totalHours = mods.reduce((s, m) => s + (m.hours ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Module planner</h1>
          <p className="text-sm text-muted-foreground">
            Sequenced M1–M7 syllabus for the technical CRT programme.
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3.5 w-3.5" /> {totalHours} hours total
        </Badge>
      </div>

      <Accordion type="multiple" defaultValue={mods.slice(0, 1).map((m) => m.id)}>
        {mods.map((m) => {
          const list = topics.filter((t) => t.module_id === m.id);
          const done = list.filter((t) => t.completed).length;
          return (
            <AccordionItem key={m.id} value={m.id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex w-full items-center justify-between gap-4 pr-3">
                  <span className="flex items-center gap-3 text-left">
                    <Badge className="shrink-0">{m.code}</Badge>
                    <span className="font-display text-sm font-semibold">{m.title}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                    {m.hours} h · {done}/{list.length}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="font-display text-sm">
                      Objective · {m.weight_percent}% weight
                    </CardTitle>
                    <CardDescription>{m.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Progress value={list.length ? (done / list.length) * 100 : 0} />
                    <ul className="space-y-2">
                      {list.map((t) => (
                        <li key={t.id} className="flex items-start gap-3 rounded-md border p-3">
                          <Checkbox
                            checked={!!t.completed}
                            disabled={!isTrainer || mutation.isPending}
                            onCheckedChange={(v) =>
                              mutation.mutate({ id: t.id, completed: v === true })
                            }
                            className="mt-0.5"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{t.title}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{t.hours} h</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {m.deliverable && (
                      <p className="rounded-md bg-secondary p-3 text-xs text-secondary-foreground">
                        Deliverable: {m.deliverable}
                      </p>
                    )}
                    {!isTrainer && (
                      <p className="text-xs text-muted-foreground">
                        Completion is marked by your trainer.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
