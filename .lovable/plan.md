## Goal

Students should always be able to open a coding test directly from the Assessments page, and be able to *run* their code (JavaScript and Python) in the browser before submitting.

## Part 1 — Make the link always work

Today the student card only shows "Open coding test" if a published test already exists and is linked (by `assessment_id`, or by module + same date). When a trainer schedules a coding assessment but never builds a test, students see a dead-end "Practice coding problems" button.

Changes:
- Show the real state per assessment card instead of a fallback: **Open coding test** (published test found), **Opens on <date>** (test exists but not yet published / window not open), **Submitted — view result** (attempt already submitted), or **Not published yet** with no misleading link.
- Trainer side: on each `coding_test` assessment row, surface whether a linked test exists; if not, a one-click **Create linked coding test** that builds a published test from the coding questions of that module and stamps `assessment_id`. (The generator already supports coding-only papers; this just makes the link explicit and visible.)
- Widen the student matcher so a linked-but-unpublished test is detected and reported rather than silently ignored.

## Part 2 — Run code in the browser

On the test-taking page (`/tests/$testId`), every `coding` question gets a small editor panel instead of a plain textarea:

- Language selector: **JavaScript** and **Python**.
- **Run** button, an editable stdin box, and an output console showing stdout / errors and run time.
- JavaScript runs in a sandboxed Web Worker with a hard timeout (~5s) so an infinite loop can't freeze the exam tab.
- Python runs via Pyodide, loaded lazily from CDN only when the student first picks Python (kept out of the main bundle so the rest of the app stays fast).
- Running is a scratchpad only — it never scores. The submitted answer stays the code text, and grading remains server-side through the existing `grade_attempt` RPC.
- Proctoring stays intact: the run panel does not open new windows and does not affect the existing blur/focus counting.

## Technical notes

- New `src/lib/runner/js-worker.ts` (worker source) and `src/lib/runner/pyodide.ts` (lazy loader), plus a `CodeRunner` component used by `tests.$testId.tsx`.
- Pyodide is loaded from its CDN at runtime via a dynamic script tag inside a client-only effect — no SSR import, so the exam route still renders server-side.
- No database schema change is required for the runner. Part 1 uses the existing `tests.assessment_id` column.
- Runner output is client-only and never persisted, so no new data exposure.
