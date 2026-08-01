import { createFileRoute, Link } from "@tanstack/react-router";
import { Medal, Trophy } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { BadgeCard } from "@/components/leetcode/BadgeCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORY_LABEL, type AchievementCategory } from "@/lib/achievements";
import { AchievementTimeline } from "@/components/leetcode/AchievementTimeline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAchievements } from "@/lib/use-achievements";

export const Route = createFileRoute("/_authenticated/achievements")({
  head: () => ({
    meta: [
      { title: "Achievements — CRT Training Console" },
      {
        name: "description",
        content:
          "Badges earned for solved problems, difficulty milestones, submission streaks and contest results.",
      },
      { property: "og:title", content: "Achievements — CRT Training Console" },
      {
        property: "og:description",
        content: "Track every badge you have unlocked and how close the next one is.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AchievementsPage,
});

const ORDER: AchievementCategory[] = ["solving", "difficulty", "consistency", "contest"];

function AchievementsPage() {
  const { badges, unlocked, timeline, isLoading } = useAchievements();

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  const percent = badges.length ? Math.round((unlocked.length / badges.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Achievements"
        description="Badges unlock automatically as you solve, submit and compete."
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to="/problems">Solve problems</Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-6 p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-amber-400/20 text-amber-600 dark:text-amber-400">
              <Trophy className="size-6" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold tabular-nums leading-none">
                {unlocked.length}
                <span className="text-base font-normal text-muted-foreground">/{badges.length}</span>
              </p>
              <p className="text-xs text-muted-foreground">badges unlocked</p>
            </div>
          </div>
          <div className="min-w-52 flex-1 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Collection progress</span>
              <span className="tabular-nums">{percent}%</span>
            </div>
            <Progress value={percent} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="grid">All badges</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-display text-base">
                <Medal className="size-4 text-muted-foreground" />
                Achievement history
              </CardTitle>
              <CardDescription>When each badge was earned, and what earned it</CardDescription>
            </CardHeader>
            <CardContent>
              <AchievementTimeline events={timeline} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grid" className="space-y-4">
          {ORDER.map((category) => {
        const rows = badges.filter((b) => b.category === category);
        const earned = rows.filter((b) => b.unlocked).length;
        return (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-display text-base">
                <Medal className="size-4 text-muted-foreground" />
                {CATEGORY_LABEL[category]}
              </CardTitle>
              <CardDescription className="tabular-nums">
                {earned}/{rows.length} unlocked
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((badge) => (
                <BadgeCard key={badge.id} badge={badge} />
              ))}
            </CardContent>
          </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
