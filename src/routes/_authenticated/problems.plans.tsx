import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Target } from "lucide-react";

import { studyPlansQuery } from "@/lib/crt-queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/problems/plans")({
  head: () => ({
    meta: [
      { title: "Study plans — CRT Training Console" },
      {
        name: "description",
        content:
          "Curated coding tracks such as Top Interview 30, Arrays & Strings and Dynamic Programming with per-track progress.",
      },
      { property: "og:title", content: "Study plans — CRT Training Console" },
      {
        property: "og:description",
        content: "Follow a curated coding track and track your progress problem by problem.",
      },
    ],
  }),
  component: StudyPlansPage,
});

function StudyPlansPage() {
  const plans = useQuery(studyPlansQuery);

  if (plans.isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link to="/problems">
            <ArrowLeft className="size-4" /> Problem set
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Study plans</h1>
          <p className="text-sm text-muted-foreground">
            Curated tracks that take you from warm-up questions to interview favourites.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(plans.data ?? []).map((plan) => {
          const percent = plan.total ? Math.round((plan.solved / plan.total) * 100) : 0;
          return (
            <Card key={plan.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="size-4 text-primary" /> {plan.name}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {plan.solved}/{plan.total} solved
                  </span>
                  <span className="tabular-nums">{percent}%</span>
                </div>
                <Progress value={percent} className="h-1.5" />
                <Button asChild size="sm" className="w-full">
                  <Link to="/problems/plans/$slug" params={{ slug: plan.slug }}>
                    Open plan
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
        {(plans.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No study plans yet.</p>
        )}
      </div>
    </div>
  );
}
