import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import { EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { TIER_STYLE, relativeDay, type AchievementEvent } from "@/lib/achievements";

const monthLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" });

/** Vertical history of badge unlocks, newest first, linked to what earned them. */
export function AchievementTimeline({
  events,
  limit,
  showMonths = true,
}: {
  events: AchievementEvent[];
  limit?: number;
  showMonths?: boolean;
}) {
  const rows = limit ? events.slice(0, limit) : events;

  if (!rows.length) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No badges earned yet"
        description="Submit an accepted solution to start your achievement history."
        action={
          <Button asChild size="sm">
            <Link to="/problems">Browse problems</Link>
          </Button>
        }
      />
    );
  }

  let lastMonth = "";

  return (
    <ol className="relative space-y-4 pl-2">
      {rows.map((event) => {
        const tier = TIER_STYLE[event.badge.tier];
        const Icon = event.badge.icon;
        const month = monthLabel(event.earnedAt);
        const newMonth = showMonths && month !== lastMonth;
        lastMonth = month;

        return (
          <li key={`${event.badge.id}-${event.earnedAt}`}>
            {newMonth && (
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {month}
              </p>
            )}
            <div className="relative flex gap-3 border-l pl-6">
              <span
                className={`absolute -left-4 top-0 flex size-8 items-center justify-center rounded-full border bg-background ${tier.text}`}
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1 pb-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="text-sm font-semibold">{event.badge.name}</p>
                  <span
                    className="text-xs text-muted-foreground"
                    title={new Date(event.earnedAt).toLocaleString()}
                  >
                    {relativeDay(event.earnedAt)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{event.badge.description}</p>
                {event.source?.kind === "submission" && (
                  <p className="mt-1 text-xs">
                    <span className="text-muted-foreground">Unlocked by </span>
                    <Link
                      to="/problems/$slug"
                      params={{ slug: event.source.slug }}
                      className="font-medium hover:underline"
                    >
                      {event.source.title}
                    </Link>
                  </p>
                )}
                {event.source?.kind === "contest" && (
                  <p className="mt-1 text-xs">
                    <span className="text-muted-foreground">Rank #{event.source.rank} in </span>
                    <Link
                      to="/problems/contests/$slug"
                      params={{ slug: event.source.slug }}
                      className="font-medium hover:underline"
                    >
                      {event.source.title}
                    </Link>
                  </p>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
