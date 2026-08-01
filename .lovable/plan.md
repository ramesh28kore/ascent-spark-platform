## Goal

Bring the student problem hub to full LeetCode parity on top of the existing `/problems`, `/problems/$slug` and `/problems/profile` workspace, then verify the whole flow signed in.

## 1. Bigger problem bank

- Seed ~40 more original problems (no copied LeetCode text) across easy/medium/hard and topics: arrays, hashing, two pointers, sliding window, stack, binary search, linked list, trees, graphs, DP, greedy, bit manipulation.
- Each problem ships statement, examples, constraints, 3 progressive hints, editorial, Python + JavaScript starters, 2 sample + 3-5 hidden test cases, tags and a company label.
- Seeded through a migration with literal INSERTs so the set exists on first load.

## 2. Discuss + bookmarks

- Use the existing `discussion_posts` and `bookmarks` tables (add any missing access rules).
- Discuss tab on `/problems/$slug`: threaded posts with replies, author name, relative timestamps, post box, delete-own.
- Bookmark (star) toggle in the problem header and in the list row; a "Favourites" status filter on `/problems`.

## 3. Study plans & topic lists

- New `study_plans` + `study_plan_items` tables (curated tracks: Top Interview 50, Arrays & Hashing, Two Pointers, Trees & Graphs, DP Foundations).
- New `/problems/plans` page: track cards with progress rings; a track detail view listing its problems in order with solved ticks, linking into the workspace.
- Progress derives from existing `problem_submissions`, so nothing extra to maintain.

## 4. Contests & daily challenge

- New `contests` + `contest_problems` + `contest_registrations` tables; staff create contests from the existing tests/admin surface, students join from `/problems/contests`.
- Contest page: countdown, ordered problem list, live leaderboard (score = solved × difficulty points, tie-break by first-accept time), start/end gating so submissions outside the window don't count.
- Daily challenge: a date-seeded pick already on the student dashboard is promoted to a real `daily_challenges` row with a calendar strip showing completed days and the streak.

## 5. Navigation & polish

- Sidebar sub-items under "Problem set": Problems, Study plans, Contests, Profile.
- Per-route `head()` metadata for each new page.

## 6. Verification

Sign in as the QA student in a headless browser and walk: dashboard → problem list (filters, favourites) → open a problem → hints → run samples → submit and see per-case verdicts → post a discuss reply → join a contest and submit → check plan progress, daily calendar and profile updates. Report with screenshots and fix anything broken.

## Technical notes

- All new schema goes through migrations with GRANTs + RLS (students read curated content and write only their own rows; staff manage).
- Contest scoring and window enforcement live in server functions using `requireSupabaseAuth`; hidden expectations never reach the client.
- Reuse `CaseResults`, `ProgressRing`, `SubmissionHeatmap` and `problems-shared.ts` rather than duplicating logic.
