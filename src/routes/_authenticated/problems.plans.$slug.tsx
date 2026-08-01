import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";

import { studyPlanQuery } from "@/lib/crt-queries";
import { LEVEL_TONE } from "@/lib/problems-shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/problems/plans/$slug")({
  head: ({ params }) => {
    const name = params.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      meta: [
        { title: `${name} study plan — CRT Training Console` },
        {
          name: "description",
          content: `Work through the ${name} coding track problem by problem and watch your progress fill up.`,
        },
        { property: "og:title", content: `${name} study plan — CRT Training Console` },
        { property: "og:description", content: `Curated coding track: ${name}.` },
      ],
    };
  },
  component: StudyPlanPage,
});

function StudyPlanPage() {
  const { slug } = Route.useParams();
  const plan = useQuery(studyPlanQuery(slug));

  if (plan.isPending && !plan.isError) return <Skeleton className="h-96 w-full" />;
  if (plan.isError || !plan.data)
    return (
      <Card>
        <CardContent className="space-y-3 p-6">
          <p className="text-sm text-muted-foreground">This study plan is not available.</p>
          <Button asChild variant="outline" size="sm">
            <Link to="/problems/plans">Back to study plans</Link>
          </Button>
        </CardContent>
      </Card>
    );

  const problems = plan.data.problems;
  const solved = problems.filter((p) => p.solved).length;
  const percent = problems.length ? Math.round((solved / problems.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link to="/problems/plans">
            <ArrowLeft className="size-4" /> Study plans
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{plan.data.plan.name}</h1>
          <p className="text-sm text-muted-foreground">{plan.data.plan.description}</p>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {solved} of {problems.length} solved
            </span>
            <span className="tabular-nums text-muted-foreground">{percent}%</span>
          </div>
          <Progress value={percent} className="h-2" />
        </CardContent>
      </Card>

      <div className="space-y-2">
        {problems.map((p, i) => (
          <Link
            key={p.id}
            to="/problems/$slug"
            params={{ slug: p.slug }}
            className="flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors hover:bg-accent/40"
          >
            {p.solved ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
            ) : (
              <Circle className="size-4 shrink-0 text-muted-foreground/40" />
            )}
            <span className="w-6 shrink-0 tabular-nums text-xs text-muted-foreground">{i + 1}</span>
            <span className="flex-1 truncate font-medium">{p.title}</span>
            {p.category ? (
              <Badge variant="secondary" className="hidden font-normal sm:inline-flex">
                {p.category}
              </Badge>
            ) : null}
            <span className={`w-16 shrink-0 text-right text-xs capitalize ${LEVEL_TONE[p.level]}`}>
              {p.level}
            </span>
          </Link>
        ))}
        {problems.length === 0 && (
          <p className="text-sm text-muted-foreground">No problems in this plan yet.</p>
        )}
      </div>
    </div>
  );
}
