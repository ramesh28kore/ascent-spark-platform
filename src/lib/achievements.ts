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

/* ------------------------------------------------------------------ */
/*  Timeline: replay history to work out WHEN each badge was earned    */
/* ------------------------------------------------------------------ */

export type TimelineSource =
  | { kind: "submission"; submissionId: string; slug: string; title: string }
  | { kind: "contest"; slug: string; title: string; rank: number };

export type AchievementEvent = {
  badge: Achievement;
  earnedAt: string;
  source: TimelineSource | null;
};

export type TimelineSubmission = {
  id: string;
  problem_id: string;
  verdict: string;
  created_at: string;
};

export type TimelineProblem = { id: string; slug: string | null; title: string; level: string };

export type TimelineContest = {
  slug: string;
  title: string;
  rank: number;
  ends_at?: string | null;
};

type Counters = {
  solvedTotal: number;
  easy: number;
  medium: number;
  hard: number;
  submissions: number;
  accepted: number;
  acceptance: number;
  streak: number;
  earlyBird: number;
  nightOwl: number;
};

/** Metric each non-contest badge tracks, so the replay knows what to watch. */
const METRIC: Record<string, (c: Counters) => number> = {
  "first-blood": (c) => c.solvedTotal,
  "solver-10": (c) => c.solvedTotal,
  "solver-25": (c) => c.solvedTotal,
  "solver-50": (c) => c.solvedTotal,
  "solver-100": (c) => c.solvedTotal,
  "easy-10": (c) => c.easy,
  "medium-10": (c) => c.medium,
  "medium-25": (c) => c.medium,
  "hard-1": (c) => c.hard,
  "hard-10": (c) => c.hard,
  "streak-3": (c) => c.streak,
  "streak-7": (c) => c.streak,
  "streak-30": (c) => c.streak,
  "submissions-50": (c) => c.submissions,
  "accuracy-70": (c) => c.acceptance,
  "early-bird": (c) => c.earlyBird,
  "night-owl": (c) => c.nightOwl,
};

const CONTEST_BADGES = new Set([
  "contest-join",
  "contest-solve",
  "contest-3",
  "contest-top10",
  "contest-win",
]);

const dayOf = (iso: string) => new Date(iso).toISOString().slice(0, 10);
const DAY = 86_400_000;

/**
 * Replays the student's submission history oldest-first and stamps the moment
 * each badge crossed its target, together with the submission that did it.
 */
export function computeAchievementTimeline(
  badges: Achievement[],
  submissions: TimelineSubmission[],
  problems: TimelineProblem[],
  contests: TimelineContest[] = [],
): AchievementEvent[] {
  const byId = new Map(problems.map((p) => [p.id, p]));
  const ordered = [...submissions].sort((a, b) => a.created_at.localeCompare(b.created_at));

  const counters: Counters = {
    solvedTotal: 0,
    easy: 0,
    medium: 0,
    hard: 0,
    submissions: 0,
    accepted: 0,
    acceptance: 0,
    streak: 0,
    earlyBird: 0,
    nightOwl: 0,
  };

  const solvedIds = new Set<string>();
  const activeDays = new Set<string>();
  const pending = new Map(
    badges.filter((b) => b.unlocked && METRIC[b.id]).map((b) => [b.id, b] as const),
  );
  const events: AchievementEvent[] = [];

  for (const sub of ordered) {
    const problem = byId.get(sub.problem_id);
    const when = new Date(sub.created_at);

    counters.submissions += 1;
    if (sub.verdict === "accepted") counters.accepted += 1;
    counters.acceptance = Math.round((counters.accepted / counters.submissions) * 100);
    if (when.getHours() < 8) counters.earlyBird += 1;
    if (when.getHours() >= 22) counters.nightOwl += 1;

    if (sub.verdict === "accepted" && !solvedIds.has(sub.problem_id)) {
      solvedIds.add(sub.problem_id);
      counters.solvedTotal += 1;
      const level = problem?.level;
      if (level === "easy") counters.easy += 1;
      else if (level === "medium") counters.medium += 1;
      else if (level === "hard") counters.hard += 1;
    }

    // Streak as of this submission: consecutive active days ending today.
    const key = dayOf(sub.created_at);
    activeDays.add(key);
    let run = 0;
    let cursor = new Date(`${key}T00:00:00.000Z`).getTime();
    while (activeDays.has(new Date(cursor).toISOString().slice(0, 10))) {
      run += 1;
      cursor -= DAY;
    }
    counters.streak = Math.max(counters.streak, run);

    for (const [id, badge] of [...pending]) {
      if (METRIC[id]!(counters) >= badge.target) {
        pending.delete(id);
        events.push({
          badge,
          earnedAt: sub.created_at,
          source: problem
            ? {
                kind: "submission",
                submissionId: sub.id,
                slug: problem.slug ?? "",
                title: problem.title,
              }
            : null,
        });
      }
    }
  }

  /* Contest badges are stamped with the contest that unlocked them. */
  const played = [...contests]
    .filter((c) => !!c.ends_at)
    .sort((a, b) => (a.ends_at ?? "").localeCompare(b.ends_at ?? ""));
  const contestEvent = (id: string, contest: TimelineContest | undefined) => {
    const badge = badges.find((b) => b.id === id);
    if (!badge?.unlocked || !contest?.ends_at) return;
    events.push({
      badge,
      earnedAt: contest.ends_at,
      source: { kind: "contest", slug: contest.slug, title: contest.title, rank: contest.rank },
    });
  };

  contestEvent("contest-join", played[0]);
  contestEvent("contest-solve", played[0]);
  contestEvent("contest-3", played[2]);
  contestEvent(
    "contest-top10",
    played.find((c) => c.rank <= 10),
  );
  contestEvent(
    "contest-win",
    played.find((c) => c.rank === 1),
  );

  return events.sort((a, b) => b.earnedAt.localeCompare(a.earnedAt));
}

/** "3 days ago" style label for timeline entries. */
export function relativeDay(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 30) return `${diff} days ago`;
  if (diff < 365) return `${Math.round(diff / 30)} months ago`;
  return `${Math.round(diff / 365)} years ago`;
}
