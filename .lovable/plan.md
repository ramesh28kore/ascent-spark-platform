# CRT Python Training Platform — completing the spec

The app already covers a large part of the spec: auth with roles, batches, sessions, attendance, modules/topics, question bank, MCQ test engine with timer/shuffle/proctoring/auto-scoring, coding questions with browser execution and AI grading, practice ladder, resources, readiness scoreboard, bulk import, alerts, and student/batch CSV+PDF exports with CO/PO mapping.

This plan builds only what is missing, in four phases.

## Stack note

The app stays on its current stack (TanStack Start + Lovable Cloud). Next.js, Prisma and a self-hosted Docker sandbox are not available here, and rebuilding would throw away all existing data and screens. The equivalents used instead:

| Spec | Here |
|---|---|
| Next.js API routes | TanStack server functions |
| Prisma | Lovable Cloud database (Postgres + row-level security) |
| Docker Python sandbox | Hosted execution API (Piston) called server-side, with the existing in-browser Pyodide runner as fallback |
| Vercel | Lovable publish |

## Phase 1 — Server-side Python + exams 2 to 6

Python execution moves server-side so scoring is trustworthy: a server function submits code to a hosted sandbox, runs every visible and hidden test case, and records runtime and memory. The browser runner stays for the "Run" scratchpad so students get instant feedback with no quota.

New exam modes on the existing test engine:
- **Theory** — Part A short answers, Part B long answers, trainer evaluation screen with a rubric (per-criterion marks + comment), running total, release-to-student action.
- **Programming** — Monaco editor, visible + hidden cases, compile & run, submit, per-case verdict, execution time and memory, automatic scoring.
- **Debugging** — trainer stores a broken program plus the fixed reference and expected behaviour; the student edits the buggy code and submits; auto-evaluated against test cases with an error-category tag.
- **Timed challenge** — difficulty tier, 60-minute window, automatic judge, live leaderboard ranked by score then time.
- **Practical viva** — trainer rubric across confidence, logic, coding ability and communication, 30 marks total.

Database: `exam_kind` on tests, rubric definition and rubric score tables, `hidden`/`visible` test cases, submissions gain runtime/memory/verdict, leaderboard view.

## Phase 2 — Playground and practice depth

- `/playground` — Monaco Python editor with syntax highlighting, autocomplete, dark mode, console output, stdin, run, and save/load of personal snippets.
- Practice section gains difficulty and topic filters, company tags, bookmarks, staged hints, solutions unlocked after an attempt, and a per-question discussion thread.
- Question bank categories extended to the full spec list (basics, functions, loops, recursion, strings, lists, tuples, sets, dict, OOP, DSA, patterns, interview).

## Phase 3 — Certificates and reports

- Certificates issued automatically on module completion, final assessment pass and full programme completion; PDF download; each carries a QR code pointing at a public `/verify/{code}` page that confirms holder, programme and issue date.
- Report centre: student-wise, batch-wise, module-wise and trainer-wise reports exported as PDF, Excel and CSV.

## Phase 4 — Analytics and AI

- Analytics dashboard: weekly progress, module completion, average score, coding accuracy, attempt history, submission heat map, top performers, weak topics and recommendations.
- AI features on Lovable AI: coding feedback on submissions, question generator for trainers (topic + difficulty + count, preview before saving), and a plain-English performance analysis per student.

## Cross-cutting (added alongside the phases)

Dark/light toggle, announcements, audit log of trainer/admin actions, global search, pagination on long tables, and email notifications for exam scheduling and result release.

## Not included

Docker configuration, Prisma schema files, and a unit/integration test suite are out of scope for this stack; database migrations and row-level security policies serve the schema role, and verification is done against the running app.

## Technical notes

- Python judging runs in a server function against a hosted sandbox with per-run time and output caps; student code never reaches privileged credentials.
- Hidden test cases and rubric internals are protected at the column and policy level, matching the existing answer-key hardening.
- Monaco is loaded lazily on the client only, so server rendering is unaffected.
- Certificate verification is a public route reading a single non-personal row; everything else stays behind the authenticated gate.
