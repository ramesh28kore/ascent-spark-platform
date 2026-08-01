## Goal

Give student logins a LeetCode-style experience inside the existing CRT console: a problem set page, a split-view problem workspace with editor + test cases, real judging, submission history, and progress/streak stats. Trainer/admin areas stay untouched.

## What gets built

### 1. Problem set page (`/problems`)
LeetCode-style table over the existing practice problem bank:
- Columns: status tick (solved / attempted / todo), #, Title, Category/Topic tags, Difficulty (Easy/Medium/Hard colour-coded), Acceptance %, Company tag.
- Filters: search, difficulty, topic, company, status; "Pick random problem" button.
- Header strip: solved counts by difficulty with progress rings, current streak.

### 2. Problem workspace (`/problems/$slug`)
Two-pane resizable layout, exactly the LeetCode shape:
- Left tabs: **Description** (statement, examples, constraints), **Hints** (progressively revealed), **Solution** (locked until solved or after N attempts), **Submissions** (this user's past runs), **Discuss** (threaded posts).
- Right: language selector, Monaco editor with per-language starter code, autosaved draft per problem.
- Bottom console: **Testcase** tab (editable sample inputs) and **Result** tab (per-case verdict, expected vs actual diff, runtime, memory) — reusing the existing `CaseResults` component.
- Buttons: **Run** (sample cases only) and **Submit** (all cases, authoritative server judge) with verdicts: Accepted, Wrong Answer, TLE, Runtime Error, Compile Error.

### 3. Judging + persistence
- Submissions go through the existing server-side judge path (Judge0), never the browser, so verdicts can't be faked.
- New `problem_submissions` table records code, language, verdict, cases passed, runtime, memory, timestamp — with row-level rules so a student only sees their own submissions, trainers see all.
- Problem `acceptance rate` derived from submissions.
- Practice progress (`todo/attempted/solved`) updates automatically on submit, so the existing readiness index keeps working unchanged.

### 4. Student profile / progress (`/problems/profile`)
- Solved-by-difficulty donut, topic-wise mastery bars, submission heatmap calendar (last 12 months), streak counter, recent submissions list.

### 5. Content management (trainer side)
Extend the existing question/practice authoring so trainers can add LeetCode-style problems: markdown statement, examples, constraints, hints, editorial solution, topic + company tags, starter code per language, and hidden/sample test cases.

## Deliberately out of scope (for now)
Contests and rating, premium/paywall tiers, global leaderboards across problems, public user profiles, interview mock timer products, LeetCode's own problem content (their problems are copyrighted — the app ships your own/seeded problems and any trainer-authored ones).

## Technical notes
- Routes under `src/routes/_authenticated/problems.*` so the existing auth gate and role-aware sidebar apply; the sidebar gets a "Problems" entry for students and trainers, still hidden for super admin.
- Reuses `CodeEditor.tsx`, `CaseResults.tsx`, `judge.functions.ts`/`judge.server.ts`, `practice_problems`, `bookmarks`, `discussion_posts` — those tables already exist with `statement`, `hints`, `solution`, `company`, `category` columns.
- One database migration: `problem_submissions` table (+ grants, RLS, indexes) and a couple of columns on `practice_problems` for starter code and test cases if missing.
- Judging stays server-side; the in-browser Pyodide runner is used only for the "Run" preview.
- Seed a starter set of original problems across Easy/Medium/Hard with test cases so the page isn't empty on first load.

## Suggested build order
1. Migration + seed problems.
2. Problem set page with filters and status.
3. Problem workspace (description/editor/console, Run + Submit).
4. Submissions, hints, solution, discuss tabs.
5. Profile/progress page and sidebar wiring.
