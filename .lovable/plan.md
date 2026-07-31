## Goal

After a student submits a coding answer, show a breakdown of every test case: pass/fail verdict, and for visible (non-hidden) cases the input, expected output, and actual output side by side with the differing lines highlighted.

The per-case data is already produced by the sandbox judge and stored on each submission (`coding_submissions.case_results`), with hidden cases already stripped down to `{ index, hidden, passed, runtime_ms }` so answers never leak. Nothing new needs to be computed or stored — this is a display gap.

## What students will see

A "Test case results" panel inside the graded-submission card:

- One row per case: `Case 1 · Passed` / `Case 2 · Failed`, plus runtime in ms.
- Hidden cases render as `Hidden case · Passed/Failed` with no input/expected/actual (padlock icon).
- Visible failing cases expand to a two-column diff: **Expected** vs **Your output**, with mismatching lines tinted red and matching lines neutral; extra/missing lines are shown as blank-padded rows so the columns stay aligned.
- Errors (runtime error, timeout, compile error) show the captured message instead of the actual-output column.
- A summary line above the list: `3/5 cases passed · judged in sandbox · 42 ms · 3.5 MB`, or a note when the score came from AI review because the sandbox was unavailable.

## Changes

**New component `src/components/CaseResults.tsx`**
- Props: `results` (the stored `case_results` array), `passed`, `total`, `judgedBy`, `runtimeMs`, `memoryKb`.
- Parses the JSON defensively (older submissions have `[]`) and renders nothing but a plain `x/y cases passed` line when the array is empty.
- Line-level diff helper: split both sides on newline, trim trailing whitespace, compare index by index, mark rows equal/different.
- Failing visible cases start expanded; passing cases are collapsed behind a click.

**`src/components/CodeRunner.tsx`**
- Render `<CaseResults />` in the graded-submission branch, replacing the current "N/M cases passed locally" text.
- Accept the case data through the existing `submission` prop (extend `CodingSubmissionView` with `case_results`, `judged_by`, `runtime_ms`, `memory_kb`).

**`src/lib/coding.functions.ts`**
- Return `case_results`, and the already-computed `judged_by`/`runtime_ms`/`memory_kb`, from `gradeCodingSubmission` so the panel appears immediately on submit rather than only after a refetch.

**`src/routes/_authenticated/tests.$testId.tsx`**
- Pass the extra fields from the loaded submission rows into `CodeRunner` (the paper already selects `*` from `coding_submissions`).

**`src/routes/_authenticated/evaluate.tsx`**
- Reuse the same component on the trainer evaluation desk, with hidden cases fully expanded (input/expected/actual visible to staff) so overrides can be judged against the real failure.

## Technical notes

- Hidden-case redaction stays server-side where it already happens; the component's "staff" mode only reveals what the server chose to send, so a student's payload has nothing extra to unlock.
- No migration and no schema change — `case_results` already exists and is populated by the sandbox path.
