import { describe, expect, it } from "vitest";

import {
  computeAchievementTimeline,
  computeAchievements,
  nextUp,
  relativeDay,
  type AchievementInput,
  type TimelineProblem,
  type TimelineSubmission,
} from "./achievements";

const input = (over: Partial<AchievementInput> = {}): AchievementInput => ({
  solved: { easy: 0, medium: 0, hard: 0, total: 0 },
  submissions: [],
  streak: 0,
  contest: { registered: 0, participated: 0, bestRank: null, wins: 0 },
  ...over,
});

const badge = (list: ReturnType<typeof computeAchievements>, id: string) =>
  list.find((a) => a.id === id)!;

describe("computeAchievements", () => {
  it("locks everything for a brand new student", () => {
    const list = computeAchievements(input());
    expect(list.length).toBeGreaterThan(10);
    expect(list.every((a) => !a.unlocked && a.value === 0)).toBe(true);
  });

  it("unlocks solving badges once the target is reached", () => {
    const list = computeAchievements(input({ solved: { easy: 8, medium: 2, hard: 0, total: 10 } }));
    expect(badge(list, "first-blood").unlocked).toBe(true);
    expect(badge(list, "solver-10").unlocked).toBe(true);
    expect(badge(list, "solver-25").unlocked).toBe(false);
  });

  it("tracks difficulty badges from the per-level counts", () => {
    const list = computeAchievements(input({ solved: { easy: 10, medium: 0, hard: 1, total: 11 } }));
    expect(badge(list, "easy-10").unlocked).toBe(true);
    expect(badge(list, "hard-1").unlocked).toBe(true);
    expect(badge(list, "hard-10").unlocked).toBe(false);
  });

  it("caps displayed progress at the target", () => {
    const list = computeAchievements(input({ solved: { easy: 0, medium: 0, hard: 0, total: 999 } }));
    expect(badge(list, "solver-10").value).toBe(10);
  });

  it("unlocks the streak badges from the streak length", () => {
    const list = computeAchievements(input({ streak: 7 }));
    expect(badge(list, "streak-3").unlocked).toBe(true);
    expect(badge(list, "streak-7").unlocked).toBe(true);
    expect(badge(list, "streak-30").unlocked).toBe(false);
  });

  it("derives accuracy and time-of-day badges from submissions", () => {
    const submissions = Array.from({ length: 10 }, (_, i) => ({
      verdict: i < 8 ? "accepted" : "wrong_answer",
      created_at: new Date(2026, 0, 5, 6, 0).toISOString(),
    }));
    const list = computeAchievements(input({ submissions }));
    expect(badge(list, "accuracy-70").unlocked).toBe(true);
    expect(badge(list, "early-bird").value).toBeGreaterThan(0);
  });

  it("unlocks contest badges from contest stats", () => {
    const list = computeAchievements(
      input({ contest: { registered: 1, participated: 3, bestRank: 1, wins: 1 } }),
    );
    expect(badge(list, "contest-join").unlocked).toBe(true);
    expect(badge(list, "contest-3").unlocked).toBe(true);
    expect(badge(list, "contest-win").unlocked).toBe(true);
  });
});

describe("nextUp", () => {
  it("returns the locked badges closest to completion", () => {
    const list = computeAchievements(input({ solved: { easy: 0, medium: 0, hard: 0, total: 9 } }));
    const next = nextUp(list, 2);
    expect(next).toHaveLength(2);
    expect(next.every((a) => !a.unlocked)).toBe(true);
    expect(next[0].id).toBe("solver-10");
  });
});

describe("computeAchievementTimeline", () => {
  const problems: TimelineProblem[] = [
    { id: "p1", slug: "two-sum", title: "Two Sum", level: "easy" },
    { id: "p2", slug: "n-queens", title: "N-Queens", level: "hard" },
  ];
  const submissions: TimelineSubmission[] = [
    { id: "s2", problem_id: "p2", verdict: "accepted", created_at: "2026-01-04T10:00:00.000Z" },
    { id: "s1", problem_id: "p1", verdict: "accepted", created_at: "2026-01-01T10:00:00.000Z" },
  ];

  it("stamps a badge with the submission that unlocked it", () => {
    const badges = computeAchievements(
      input({ solved: { easy: 1, medium: 0, hard: 1, total: 2 } }),
    );
    const events = computeAchievementTimeline(badges, submissions, problems);

    const first = events.find((e) => e.badge.id === "first-blood")!;
    expect(first.earnedAt).toBe("2026-01-01T10:00:00.000Z");
    expect(first.source).toMatchObject({ kind: "submission", submissionId: "s1", slug: "two-sum" });

    const hard = events.find((e) => e.badge.id === "hard-1")!;
    expect(hard.earnedAt).toBe("2026-01-04T10:00:00.000Z");
  });

  it("returns events newest first", () => {
    const badges = computeAchievements(
      input({ solved: { easy: 1, medium: 0, hard: 1, total: 2 } }),
    );
    const events = computeAchievementTimeline(badges, submissions, problems);
    const dates = events.map((e) => e.earnedAt);
    expect([...dates].sort((a, b) => b.localeCompare(a))).toEqual(dates);
  });

  it("skips badges that are still locked", () => {
    const badges = computeAchievements(input());
    expect(computeAchievementTimeline(badges, submissions, problems)).toEqual([]);
  });

  it("attributes contest badges to the unlocking contest", () => {
    const badges = computeAchievements(
      input({ contest: { registered: 1, participated: 1, bestRank: 1, wins: 1 } }),
    );
    const events = computeAchievementTimeline(badges, [], problems, [
      { slug: "spring-cup", title: "Spring Cup", rank: 1, ends_at: "2026-02-01T12:00:00.000Z" },
    ]);
    const win = events.find((e) => e.badge.id === "contest-win")!;
    expect(win.source).toMatchObject({ kind: "contest", slug: "spring-cup", rank: 1 });
  });
});

describe("relativeDay", () => {
  it("labels recent dates in plain language", () => {
    const day = 86_400_000;
    expect(relativeDay(new Date().toISOString())).toBe("Today");
    expect(relativeDay(new Date(Date.now() - day).toISOString())).toBe("Yesterday");
    expect(relativeDay(new Date(Date.now() - 5 * day).toISOString())).toBe("5 days ago");
    expect(relativeDay(new Date(Date.now() - 90 * day).toISOString())).toBe("3 months ago");
    expect(relativeDay(new Date(Date.now() - 800 * day).toISOString())).toBe("2 years ago");
  });
});
