import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Trophy } from "lucide-react";

import { contestsQuery } from "@/lib/crt-queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/problems/contests/")({
  head: () => ({
    meta: [
      { title: "Coding contests — CRT Training Console" },
      {
        name: "description",
        content:
          "Timed coding contests with scored problems and a live leaderboard for the CRT training batch.",
      },
      { property: "og:title", content: "Coding contests — CRT Training Console" },
      {
        property: "og:description",
        content: "Join a timed contest, solve scored problems and climb the leaderboard.",
      },
    ],
  }),
  component: ContestsPage,
});

/** Live / upcoming / ended, decided on the client clock. */
export function contestPhase(startsAt: string, endsAt: string) {
  const now = Date.now();
  if (now < new Date(startsAt).getTime()) return "upcoming" as const;
  if (now > new Date(endsAt).getTime()) return "ended" as const;
  return "live" as const;
}

const PHASE_LABEL = { live: "Live now", upcoming: "Upcoming", ended: "Ended" };

function ContestsPage() {
  const contests = useQuery(contestsQuery);

  if (contests.isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link to="/problems">
            <ArrowLeft className="size-4" /> Problem set
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Contests</h1>
          <p className="text-sm text-muted-foreground">
            Timed rounds — every accepted problem inside the window adds to your score.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(contests.data ?? []).map((c) => {
          const phase = contestPhase(c.starts_at, c.ends_at);
          return (
            <Card key={c.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="size-4 text-amber-500" />
                  <CardTitle className="text-base">{c.title}</CardTitle>
                  <Badge
                    variant={phase === "live" ? "default" : "outline"}
                    className="ml-auto shrink-0"
                  >
                    {PHASE_LABEL[phase]}
                  </Badge>
                </div>
                <CardDescription>{c.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {new Date(c.starts_at).toLocaleString()} → {new Date(c.ends_at).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {c.problem_count} problems · {c.total_points} points
                  {c.registered ? " · you are registered" : ""}
                </p>
                <Button asChild size="sm">
                  <Link to="/problems/contests/$slug" params={{ slug: c.slug }}>
                    {phase === "live" ? "Enter contest" : "View contest"}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
        {(contests.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No contests scheduled yet.</p>
        )}
      </div>
    </div>
  );
}
