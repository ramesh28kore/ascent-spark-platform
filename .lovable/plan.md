## Goal

Coding questions get their own **Submit for grading** button, separate from the local **Run**. Submitting sends the code to the server, scores it, and shows the student the marks and feedback for that question. The final test score includes those coding marks.

## How a coding answer is scored

Two stages:

1. **Instant (browser)** — the code runs against the question's stored test cases in the existing sandbox (JS in a Web Worker, Python in Pyodide). Each case compares trimmed stdout to the expected output. The student immediately sees `3/4 cases passed`. This is provisional and never trusted as the final mark.
2. **AI-confirmed (server)** — the submit call sends the code, the question prompt, the test cases and the client's pass report to Lovable AI (`google/gemini-3.6-flash`). The model returns a score out of the question's marks, a verdict, and short feedback, and it is told to treat the client's pass report as an unverified claim. **The AI score is what gets recorded.** If the AI call fails (rate limit / credits), the submission is stored as `pending_review` with the provisional score shown and flagged for the trainer — never silently zero.

## Per-question submit behaviour

- Each coding question card gets: **Run** (unchanged scratchpad) and **Submit for grading**.
- Submitting locks that question's editor, shows a result panel (marks awarded, cases passed, AI feedback), and leaves the rest of the test open.
- One submission per question per attempt; a trainer can reopen it from the test detail view.
- Whole-test submit still works: it grades MCQs as today and adds the already-recorded coding marks instead of string-matching them.

## Database changes

- `questions.test_cases` — JSON array of `{ input, expected_output, hidden }`, editable by trainers in the Question Bank. Hidden cases are stripped from the student paper.
- New `coding_submissions` table: attempt, test, question, student, code, language, client pass counts, ai_score, max_score, verdict, feedback, status (`graded` / `pending_review`), timestamps. RLS: students read/insert their own; staff read all and can override the score.
- `grade_attempt` updated: for coding items it takes the recorded `coding_submissions.ai_score` (0 if none) rather than string matching, and adds it to the total.

## Server work

- `gradeCodingSubmission` server function (auth-required): validates input, loads the question and its test cases server-side, rejects submissions for closed/submitted attempts, calls Lovable AI for the score, writes the row, and returns only the marks + feedback (never the hidden expected outputs beyond what's needed for feedback).
- Answer keys and hidden test cases stay server-side; the student paper only carries visible sample cases.

## UI work

- `CodeRunner` gains an optional submit action, a result panel, and a locked state.
- Question Bank (trainer) gains a small test-case editor for coding questions.
- Test detail / results view shows per-question coding scores, verdicts and any `pending_review` flags so the trainer can adjust.
