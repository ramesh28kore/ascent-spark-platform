## Goal

Close the gaps in the MCQ exam loop so it runs end to end:
Super admin creates trainer + student credentials → trainer pastes MCQs from Notepad → trainer builds a timed test and publishes → students write it in the window → auto-marks on submit → trainer downloads the marks sheet. Student dashboard keeps its LeetCode-premium look.

## What already exists (verified)

- Super admin console creates trainer/student credentials with audit logging.
- Question bank (`questions`, MCQ type), test generator (`generateTest`), publish toggle, student paper delivery with answers stripped, attempt start/submit and server-side grading (`grade_attempt`), attempt scores in `test_attempts`.
- Student exam runner at `/tests/$testId` with proctoring blur count.

## What is missing (this plan)

1. No way to paste MCQs from Notepad — questions are added one by one through a form.
2. Test builder only picks questions randomly by difficulty; a trainer can't hand-pick the exact questions they just imported.
3. No explicit exam window UX (start/end + duration shown to students, hard close after end).
4. No trainer-facing marks sheet download for a single MCQ test.

## Notepad import format

Plain text, one block per question, blocks separated by a blank line. Correct option marked with `*`.

```text
Q: What is the time complexity of binary search on a sorted array?
A) O(n)
*B) O(log n)
C) O(n log n)
D) O(1)
MARKS: 1
LEVEL: easy
EXPLANATION: The search space halves each step.

Q: Which data structure uses FIFO ordering?
A) Stack
*B) Queue
C) Tree
D) Graph
MARKS: 1
LEVEL: easy
```

Rules: `Q:` required, 2-6 options `A)`–`F)`, exactly one starred as the answer; `MARKS:`, `LEVEL:` (easy/medium/hard) and `EXPLANATION:` optional with defaults 1 / medium / empty. Also accepts `ANSWER: B` on its own line instead of a star.

## Build steps

1. **Parser + tests** — `src/lib/mcq-import.ts`: parse text → questions, with per-block line-numbered errors (missing answer, duplicate star, too few options). Unit tests in Vitest.
2. **Trainer import UI** — new "Import MCQs" tab on `/questions`: paste box (or `.txt` upload), format help with the example above, live preview table of parsed questions with error rows highlighted, module selector, then "Import N questions" writing to `questions` with `qtype = 'mcq'`.
3. **Manual test builder** — extend `/tests` create dialog with a "Pick questions" mode: filter the MCQ bank by module/level, checkbox-select, reorder, per-question marks; plus title, batch, start time, end time, duration, shuffle, negative marking. A new `createManualTest` server function inserts `tests` + `test_items` in the chosen order.
4. **Exam window enforcement** — students see "Opens in…", "Live — ends at…", "Closed"; `startAttempt` rejects before start / after end; the runner auto-submits when the earlier of `duration` and `ends_at` is reached.
5. **Marks sheet** — "Results" view per test for trainers: student, roll number, score, %, correct/incorrect count, time taken, blur count, submitted-at — with CSV, Excel and PDF download reusing the existing export helpers. Only trainers/admin can open it.
6. **Student results** — after submit, show score, per-question review (own answer, correct answer, explanation) once the trainer marks results as released.

## Technical notes

- New server functions live in `src/lib/tests.functions.ts`; parsing logic stays in a client-safe `mcq-import.ts` so it can be unit tested and previewed in the browser.
- No schema change needed for MCQ import (`questions.options` is already jsonb, `answer` text). Results release uses the existing `tests.results_released` flag.
- Grading continues to run server-side via the existing `grade_attempt` RPC — answers are never sent to the browser.
