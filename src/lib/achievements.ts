import {
  Award,
  Crown,
  Flame,
  Medal,
  Rocket,
  Sparkles,
  Star,
  Sunrise,
  Swords,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type BadgeTier = "bronze" | "silver" | "gold" | "platinum";

export type AchievementCategory = "solving" | "difficulty" | "consistency" | "contest";

export type Achievement = {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tier: BadgeTier;
  icon: LucideIcon;
  /** Current progress toward the target. */
  value: number;
  target: number;
  unlocked: boolean;
};

export const TIER_STYLE: Record<BadgeTier, { ring: string; text: string; label: string }> = {
  bronze: { ring: "bg-amber-700/15 text-amber-700 dark:text-amber-500", text: "text-amber-700 dark:text-amber-500", label: "Bronze" },
  silver: { ring: "bg-slate-400/20 text-slate-600 dark:text-slate-300", text: "text-slate-600 dark:text-slate-300", label: "Silver" },
  gold: { ring: "bg-amber-400/20 text-amber-600 dark:text-amber-400", text: "text-amber-600 dark:text-amber-400", label: "Gold" },
  platinum: { ring: "bg-sky-400/20 text-sky-600 dark:text-sky-400", text: "text-sky-600 dark:text-sky-400", label: "Platinum" },
};

export const CATEGORY_LABEL: Record<AchievementCategory, string> = {
  solving: "Problem solving",
  difficulty: "Difficulty milestones",
  consistency: "Consistency",
  contest: "Contests",
};

export type AchievementInput = {
  /** Solved counts by difficulty. */
  solved: { easy: number; medium: number; hard: number; total: number };
  submissions: { verdict: string; created_at: string }[];
  streak: number;
  contest: { registered: number; participated: number; bestRank: number | null; wins: number };
};

type Def = Omit<Achievement, "value" | "unlocked">;

const def = (
  id: string,
  name: string,
  description: string,
  category: AchievementCategory,
  tier: BadgeTier,
  icon: LucideIcon,
  target: number,
): Def => ({ id, name, description, category, tier, icon, target });

/** Computes every badge with live progress from data already loaded on the client. */
export function computeAchievements(input: AchievementInput): Achievement[] {
  const accepted = input.submissions.filter((s) => s.verdict === "accepted").length;
  const acceptance = input.submissions.length
    ? Math.round((accepted / input.submissions.length) * 100)
    : 0;
  const earlyBird = input.submissions.filter((s) => {
    const h = new Date(s.created_at).getHours();
    return h < 8;
  }).length;
  const nightOwl = input.submissions.filter((s) => new Date(s.created_at).getHours() >= 22).length;

  const rows: { d: Def; value: number }[] = [
    { d: def("first-blood", "First blood", "Solve your first problem", "solving", "bronze", Rocket, 1), value: input.solved.total },
    { d: def("solver-10", "Getting warm", "Solve 10 problems", "solving", "bronze", Target, 10), value: input.solved.total },
    { d: def("solver-25", "Problem crusher", "Solve 25 problems", "solving", "silver", Star, 25), value: input.solved.total },
    { d: def("solver-50", "Half century", "Solve 50 problems", "solving", "gold", Trophy, 50), value: input.solved.total },
    { d: def("solver-100", "Centurion", "Solve 100 problems", "solving", "platinum", Crown, 100), value: input.solved.total },

    { d: def("easy-10", "Fundamentals", "Solve 10 easy problems", "difficulty", "bronze", Sparkles, 10), value: input.solved.easy },
    { d: def("medium-10", "Stepping up", "Solve 10 medium problems", "difficulty", "silver", Swords, 10), value: input.solved.medium },
    { d: def("medium-25", "Mid-game master", "Solve 25 medium problems", "difficulty", "gold", Medal, 25), value: input.solved.medium },
    { d: def("hard-1", "Into the deep", "Solve your first hard problem", "difficulty", "silver", Zap, 1), value: input.solved.hard },
    { d: def("hard-10", "Hard mode", "Solve 10 hard problems", "difficulty", "platinum", Crown, 10), value: input.solved.hard },

    { d: def("streak-3", "Warming up", "3-day submission streak", "consistency", "bronze", Flame, 3), value: input.streak },
    { d: def("streak-7", "Week warrior", "7-day submission streak", "consistency", "silver", Flame, 7), value: input.streak },
    { d: def("streak-30", "Unstoppable", "30-day submission streak", "consistency", "platinum", Flame, 30), value: input.streak },
    { d: def("submissions-50", "Grinder", "Make 50 submissions", "consistency", "silver", Target, 50), value: input.submissions.length },
    { d: def("accuracy-70", "Sharp shooter", "Reach 70% acceptance rate", "consistency", "gold", Award, 70), value: acceptance },
    { d: def("early-bird", "Early bird", "Submit 5 times before 8am", "consistency", "bronze", Sunrise, 5), value: earlyBird },
    { d: def("night-owl", "Night owl", "Submit 5 times after 10pm", "consistency", "bronze", Star, 5), value: nightOwl },

    { d: def("contest-join", "Contender", "Register for a contest", "contest", "bronze", Swords, 1), value: input.contest.registered },
    { d: def("contest-solve", "In the arena", "Score in a contest", "contest", "silver", Medal, 1), value: input.contest.participated },
    { d: def("contest-3", "Regular competitor", "Score in 3 contests", "contest", "gold", Trophy, 3), value: input.contest.participated },
    {
      d: def("contest-top10", "Top 10 finish", "Finish a contest in the top 10", "contest", "gold", Award, 1),
      value: input.contest.bestRank !== null && input.contest.bestRank <= 10 ? 1 : 0,
    },
    { d: def("contest-win", "Champion", "Finish first in a contest", "contest", "platinum", Crown, 1), value: input.contest.wins },
  ];

  return rows.map(({ d, value }) => ({
    ...d,
    value: Math.min(value, d.target),
    unlocked: value >= d.target,
  }));
}

/** Badges closest to unlocking, for the dashboard "next up" strip. */
export function nextUp(list: Achievement[], count = 3) {
  return list
    .filter((a) => !a.unlocked)
    .sort((a, b) => b.value / b.target - a.value / a.target)
    .slice(0, count);
}
