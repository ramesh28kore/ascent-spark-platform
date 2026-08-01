## Goal

Every badge currently shows only "unlocked / locked". Add a timeline that says **when** each badge was earned and links to the exact submission (or contest) that unlocked it.

## Approach

No new tables. The full submission history is already loaded (`problem_submissions` with `verdict`, `problem_id`, `created_at`, plus each problem's `level`/`slug`/`title`), so earn dates can be replayed chronologically and are always consistent — even for badges earned before this feature exists.

### 1. Replay engine (`src/lib/achievements.ts`)

Add `computeAchievementTimeline(input)`:
- Sort submissions oldest → newest.
- Walk them, maintaining running counters: total solved, solved per difficulty, submission count, acceptance rate, streak length, and early-bird / night-owl tallies.
- The first submission that pushes a counter to a badge's target becomes that badge's **unlock event**: `{ badgeId, earnedAt, submissionId, problemSlug, problemTitle, verdict }`.
- Contest badges (Contender, In the arena, Top 10, Champion) are stamped with the contest's end date and link to the contest page instead of a submission.
- Existing `computeAchievements` stays the source of truth for progress; the timeline attaches `earnedAt` + `source` to each unlocked badge.

Note: "first solve of a problem" is what counts, so re-submissions on an already-solved problem don't move the counters.

### 2. Contest timestamps

`getMyContestStats` (in `src/lib/leetcode.functions.ts`) currently returns slug, title, rank, solved, score. Add `ends_at` so contest badges can be placed on the timeline in the right order.

### 3. Timeline UI (`src/components/leetcode/AchievementTimeline.tsx`)

A vertical timeline, newest first:
- Tier-coloured medal icon on a connector rail.
- Badge name + description, relative date ("3 days ago") with the exact date on hover.
- "Unlocked by" row linking to the problem workspace (`/problems/$slug`) or contest (`/problems/contests/$slug`).
- Grouped by month heading when the history spans multiple months.
- Empty state when nothing is earned yet, pointing to the problem set.

### 4. Placement

- `/achievements`: timeline shown above the category grids, with a Grid / Timeline toggle so the full collection stays browsable.
- Dashboard (`StudentHome.tsx`): the achievements strip gains a "Recently earned" line showing the newest unlock and its date.
- My progress (`problems.profile.tsx`): last 3 timeline entries under the badge showcase.

### 5. Verification

Sign in as the QA student, confirm the timeline order matches the submission history, that dates are correct, and that each "unlocked by" link opens the right problem.

## Technical notes

- Pure client-side derivation from cached TanStack Query data — no migration, no writes, no extra round trips beyond the one added `ends_at` field.
- Replay is O(submissions) and memoised, so it stays cheap at the 1000-submission fetch cap.
- Streak-badge earn dates are reconstructed from day-bucketed activity, matching the existing `streakFromCounts` logic.
