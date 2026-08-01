## Goal

`/dashboard` currently shows the same CRT charts (average score, module coverage, upcoming assessments) for both trainers and students. For students it should look like a LeetCode home page, built from the problem-set data that already exists (`problemsQuery`, `problemProfileQuery` — solved counts, difficulty split, tags, submissions, streak).

## What the student dashboard will show

```text
┌──────────────────────────────────────────────────────────┐
│ Hello, <name>          [Solve daily problem] [Problem set]│
├───────────────┬──────────────────────────────────────────┤
│ Solved ring   │ Daily challenge card                     │
│ x / N total   │ (deterministic pick by date, unsolved    │
│ Easy  m/e     │  preferred) → opens /problems/$slug      │
│ Medium m/e    ├──────────────────────────────────────────┤
│ Hard  m/h     │ Streak · submissions · acceptance %      │
├───────────────┴──────────────────────────────────────────┤
│ Submission heatmap (last 12 months, same cells as profile)│
├───────────────────────────┬──────────────────────────────┤
│ Recent submissions (10)   │ Topic mastery (top 8 tags)   │
│ title · lang · verdict    │ solved/total bars            │
├───────────────────────────┴──────────────────────────────┤
│ Continue solving: 4 attempted/todo problems as cards      │
├──────────────────────────────────────────────────────────┤
│ Training snapshot (collapsed strip): average score,       │
│ pass rate, next assessment — link to /assessments         │
└──────────────────────────────────────────────────────────┘
```

Trainers keep the existing dashboard exactly as it is today.

## Implementation

1. New component `src/components/leetcode/ProgressRing.tsx` — SVG donut for solved/total with difficulty legend.
2. New component `src/components/leetcode/SubmissionHeatmap.tsx` — extract the 364-cell grid + streak logic currently inline in `problems.profile.tsx`, and reuse it in both places so there's one implementation.
3. New component `src/components/StudentHome.tsx` — the layout above, reading `problemsQuery`, `problemProfileQuery`, plus `assessmentsQuery`/`scoresQuery` for the small training strip. Daily-challenge pick is date-seeded so it's stable for the whole day.
4. `src/routes/_authenticated/dashboard.tsx` — branch on `me.data.isTrainer`: trainers get the current `Dashboard()` body (moved into a `TrainerDashboard` function in the same file), students get `<StudentHome />`. Update `head()` description to mention coding progress.
5. Styling stays on existing semantic tokens (difficulty colours come from `LEVEL_TONE`/`VERDICT_TONE` in `problems-shared.ts`); no new colour literals.

No database or server-function changes — all data is already returned by the existing problem queries.

## Verification

Sign in as a student in the preview, confirm the dashboard renders the ring, heatmap, daily challenge and recent submissions with real values, and that a trainer login still sees the original charts.
