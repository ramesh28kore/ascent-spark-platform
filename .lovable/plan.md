## Goal

Give students badges for solving problems, keeping streaks, and competing in contests — shown as a strip on the dashboard and in full on a new **Achievements** page.

## Approach

Badges are **derived** from data already in the app (submissions, solved problems, contest registrations/results) rather than stored in a new table. That means no migration, no risk of stale rows, and badges unlock instantly when a student solves something. Earned dates come from the submission that triggered the unlock.

## Badge catalogue

Four tracks, each with tiers (locked badges are shown greyed with progress toward the next tier):

- **Solved** — 1, 10, 25, 50, 100 problems solved
- **Difficulty** — first Medium solved, first Hard solved, 10 Hards
- **Streak** — 3, 7, 30, 100 consecutive days with a submission (uses the existing streak helper)
- **Contest** — registered for a contest, completed a contest, finished top 10, finished top 3
- Plus a couple of flavour badges: "Night Owl" (submission after 11pm), "Perfectionist" (accepted on first attempt for a problem)

## What gets built

1. **`src/lib/achievements.ts`** — badge definitions (id, title, description, icon, tier, threshold) and a pure `computeAchievements(...)` function taking solved problems, submissions, streak, and contest results; returns each badge with `earned`, `progress`, `earnedAt`.
2. **`src/components/leetcode/BadgeCard.tsx`** — single badge tile: icon medal, title, description, tier colour, progress bar when locked.
3. **Achievements page** at `/achievements` (`src/routes/_authenticated/achievements.tsx`) — summary header (X of Y unlocked, tier breakdown), grouped grid by track, own head() metadata.
4. **Dashboard strip** in `src/components/StudentHome.tsx` — the most recent 4–5 earned badges plus the closest badge to unlocking, linking to the full page.
5. **Sidebar entry** — "Achievements" under the **You** group in `src/components/AppShell.tsx`, next to Progress.
6. **Progress page cross-link** — small earned-badge row on `/problems/profile`.

## Technical notes

- Contest performance needs a per-student result read; the existing contest queries return contest and leaderboard data, so I'll add a small server function that returns the signed-in student's contest participations and ranks (read-only, RLS-scoped to the caller) if the current queries don't already expose it.
- No schema changes and no new tables.
- All colours use existing semantic tokens; medal tiers map to existing chart/accent tokens so dark mode keeps working.

## Verification

Sign in as the QA student with Playwright, check the dashboard strip renders, open `/achievements`, and confirm earned vs locked states and progress bars match the student's real solved/streak numbers with no console errors.
