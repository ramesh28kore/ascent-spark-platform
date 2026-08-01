# Compact Claude Code prompt

Paste this into Claude Code (single model, no sub-agents) at the root of an empty repo.

```text
Build a full-stack "CRT Training + LeetCode-style Practice" web app.

STACK (fixed): TanStack Start v1 (React 19, Vite 7, file routes in src/routes),
TypeScript, Tailwind v4 (src/styles.css tokens), shadcn/ui, TanStack Query,
Supabase (Postgres + Auth + RLS) via SQL migrations, Monaco Editor, Recharts,
Judge0 API for code execution, jsPDF + xlsx for exports. No React Router, no
Next.js, no Supabase Edge Functions — server logic uses createServerFn from
@tanstack/react-start; webhooks/public APIs use routes under src/routes/api/public/*.

ROLES: super_admin (credentials only), trainer, student. Roles live in a separate
user_roles table with an app_role enum and a SECURITY DEFINER has_role() in a
private schema. Every public table: CREATE TABLE -> GRANT -> ENABLE RLS -> POLICY.
Super admin may ONLY create/read/update/delete trainer & student credentials and
read audit logs; RLS must block it from all training/content tables. Super admin
account itself is immutable (trigger-protected against role change or delete).

DATA MODEL: profiles, user_roles, batches, students(batch, roll no), modules M1-M7,
attendance, assessments, test_items(answer keys hidden from students via RLS +
column security), attempts, scores, coding_problems, problem_submissions,
code_snapshots, bookmarks, study_plans, contests, contest_entries, certificates,
audit_logs.

FEATURES
1. Auth: email/password + Google; role-aware sidebar shell (Learn / Practice /
   Assess / You), branded page headers, progress strip footer.
2. Super Admin Console (/admin): bulk credential generation from roll-number ranges,
   single-create with a review/preview step before commit, full CRUD + bulk delete,
   credential sheet export gated server-side, every action audit-logged.
3. Trainer: batches, attendance (75% threshold flag), syllabus M1-M7, test authoring
   (MCQ, coding, descriptive), publishing with deadlines, server-side grade_attempt
   RPC, analytics dashboards, Export Centre (student/batch/module reports as
   PDF, Excel multi-sheet, CSV), CO/PO attainment mapping, placement-readiness index
   weighted 15/30/30/15/10.
4. Student: LeetCode-style dashboard (progress rings, activity heatmap, daily
   challenge, topic mastery, recent achievements); /problems hub with search,
   multi-select difficulty + topic tags with counts, company, solved/unsolved,
   favourites, sortable columns, presets, all state in the URL; problem workspace
   with resizable Monaco panes, language starter templates, autosaved per-attempt
   code snapshots with restore, Run (samples) and Submit (Judge0) with per-testcase
   verdicts and expected-vs-actual diffs; discuss threads + bookmarks; study plans;
   timed contests with leaderboards; achievements/badges with an earned-date timeline
   linking the unlocking submission; certificates with public QR verification.
5. Proctored online test engine: timer, tab-switch logging, hard deadline enforcement.

RULES: seed demo data (37+ problems across M1-M7, one batch, sample tests) with
literal INSERTs inside the migration. Never trust the client for grading, role
checks, or export authorisation. Keep colours/fonts as semantic Tailwind tokens
(academic navy theme) — no hardcoded hex in components. Give every route its own
head() with unique title/description. Verify end to end as a student before
declaring done.

Work in phases, committing after each: (1) schema + RLS + auth, (2) app shell +
routing, (3) admin console, (4) trainer suite, (5) student LeetCode experience,
(6) exports/certificates/analytics.
```

## Note

I read "fable 5" as "use one model only, no parallel agents" — tell me if you meant a specific model name and I'll swap that line.
