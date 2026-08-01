import { Lock } from "lucide-react";

import { TIER_STYLE, type Achievement } from "@/lib/achievements";
import { Progress } from "@/components/ui/progress";

/** Single achievement medal with tier colour and progress toward unlock. */
export function BadgeCard({ badge, compact = false }: { badge: Achievement; compact?: boolean }) {
  const tier = TIER_STYLE[badge.tier];
  const Icon = badge.icon;
  const percent = badge.target ? (badge.value / badge.target) * 100 : 0;

  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        badge.unlocked ? "bg-card" : "bg-muted/30"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
            badge.unlocked ? tier.ring : "bg-muted text-muted-foreground"
          }`}
        >
          {badge.unlocked ? <Icon className="size-5" /> : <Lock className="size-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p
              className={`truncate text-sm font-semibold ${badge.unlocked ? "" : "text-muted-foreground"}`}
            >
              {badge.name}
            </p>
            <span
              className={`shrink-0 text-[10px] font-medium uppercase tracking-wide ${badge.unlocked ? tier.text : "text-muted-foreground"}`}
            >
              {tier.label}
            </span>
          </div>
          {!compact && <p className="mt-0.5 text-xs text-muted-foreground">{badge.description}</p>}
          {!badge.unlocked && (
            <div className="mt-2 space-y-1">
              <Progress value={percent} className="h-1.5" />
              <p className="text-[11px] tabular-nums text-muted-foreground">
                {badge.value}/{badge.target}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
