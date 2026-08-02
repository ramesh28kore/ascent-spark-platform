## Goal

Close the loop: Super Admin issues credentials → Trainer authors problems with test cases and publishes them to chosen batches → Students solve them in a LeetCode-Premium-style workspace → Trainers download grading sheets.

## What already exists (verified)

- Super Admin console creates trainer and student accounts with generated credentials, roles are locked, deletions audited.
- Students already sign in with those credentials; role-aware sidebar, problem set, Monaco + Judge0 run/submit, submissions, contests, plans, badges.
- Trainers already export assessment/test reports.

## What is missing (verified)

- `practice_problems` has **no publish/draft state and no batch targeting** — every problem is visible to every signed-in student the moment it is inserted.
- There is **no trainer UI to author a problem with its test cases**; problems were seeded by migration.
- Trainers cannot download practice-problem grading (only assessment/test exports exist).
- No "next problem" guidance after all test cases pass.

---

## 1. Trainer problem authoring studio (new page `/authoring`)

A staff-only workspace to create and manage coding problems:

- **Details**: title, slug, difficulty, topic tags, company tags, points, module, time/memory limits.
- **Statement**: markdown statement, constraints, worked examples.
- **Test cases**: repeatable rows of input / expected output, each flagged sample (shown to students) or hidden. Add, reorder, delete.
- **Starter code** per language, plus **editorial** (official approach + reference solution).
- **Validate before publish**: trainer runs their reference solution against every test case through the existing Judge0 pipeline. A problem cannot be published until all cases pass — this is the "after all test cases done by trainer" gate.
- Draft / Published state visible in a problem list with edit, duplicate, unpublish.

## 2. Publish + batch targeting

Schema additions to `practice_problems`: `status` (draft | published), `published_at`, `author_id`, `visible_to_all_batches`, plus a `problem_batches` join table.

Access rules rewritten so:
- Students only ever read problems that are **published** AND targeted at their batch (or marked visible to all).
- Trainers/admin see their drafts.
- Every existing seeded problem is migrated to `published` + visible to all batches, so nothing disappears.

All student-facing fetchers (problem set, plans, contests, daily challenge, dashboard) go through the same filter.

## 3. Student flow — soft-guided ladder

- Problem page shows a **test-case result panel** (already built) and, once the verdict is Accepted, an **"All tests passed — Next problem →"** card that advances to the next unsolved problem in the same list/plan ordering.
- A persistent ladder strip shows position (e.g. "12 of 47 solved") and the next three targets.
- All problems stay browsable; nothing is hard-locked.

## 4. Premium-style student experience

- **Editorial & official solution**: tabbed alongside Description/Submissions, unlocked after an accepted submission (or "reveal anyway" with a confirmation).
- **Company tags & frequency**: company chips on each problem, a company-wise browse view, and sort-by-frequency.
- **Debugger extras**: custom test-case input box for Run, plus runtime/memory percentile ("beats X% of submissions") computed from stored submissions.
- **Timed interview drills**: pick topic + difficulty + duration, get a randomised set with a countdown and an end-of-drill performance report.

## 5. Trainer gradebook & downloads

New **Gradebook** tab in the export centre:
- **Matrix export** (Excel/CSV): students as rows, published problems as columns, cells showing solved/attempted/not started with attempts, best verdict, runtime and last submission time.
- **Marks sheet** (Excel + PDF): points auto-computed from solved problems, per-student totals, percentage and band, filterable by batch, module and date range.
- Both restricted to trainer/admin server-side and written to the audit log.

---

## Technical notes

- Schema: migration adding publish/targeting columns, `problem_batches`, an editorial column, company-frequency column, and grants + policies rewritten via the existing `private.is_content_reader` / `is_staff` helpers.
- New server functions in `src/lib/problems.functions.ts` and a new `src/lib/authoring.functions.ts` (draft CRUD, validate-against-Judge0, publish/unpublish, batch targeting), all behind `requireSupabaseAuth` with a staff role check.
- Gradebook builders extend `src/lib/report-builders.ts` and reuse `src/lib/export-formats.ts`.
- Sidebar gains "Authoring" and "Gradebook" for staff; "Companies" and "Interview drills" for students.
- Unit tests for the publish-visibility filter, the next-problem selector and the gradebook builders, keeping CI green.
