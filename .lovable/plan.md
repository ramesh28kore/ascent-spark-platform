## CRT Training Dashboard

A role-based web app for running Campus Recruitment Training: trainers plan modules, track student performance, generate tests and maintain a coding library; students see their progress, practice problems and take tests.

### Design
Academic navy palette (#0F2A4A deep navy, #1B4B7A mid blue, #F4F6F9 surface, #E8A317 amber accent), clean data-dense dashboard with sidebar navigation, cards, tables and charts.

### Backend (Lovable Cloud)
Email/password + Google login, with roles stored in a separate `user_roles` table (`trainer`, `student`) and a security-definer `has_role()` function used in all policies.

Tables:
- `profiles` — name, roll number, branch, year, batch
- `modules` — M1–M7: code, title, topics, hours, weight, order
- `topics` — module topics with status/progress
- `students` (via profiles) and `enrollments` — student ↔ batch
- `assessments` — weekly test / mock NQT / coding test, module link, max marks, date
- `scores` — student × assessment × marks × attempt count
- `questions` — text, options, answer, type (MCQ/coding), difficulty, Bloom level L1–L6, module/topic tags
- `test_papers` + `test_paper_questions` — generated papers
- `coding_problems` — problem, approach, Python code, expected output, complexity, interview follow-ups, difficulty, pattern
- `attendance` — optional per-session marking

RLS: students read their own scores/profile and all published modules, questions marked practice, and coding problems; trainers (via `has_role`) read/write everything. Grants issued for `authenticated` and `service_role` on every table. Seed migration with M1–M7 modules, a sample batch of students, sample assessments/scores, ~20 questions and ~10 coding problems so the dashboard is populated on first load.

### Screens
Public
- `/` — landing page describing the CRT program with sign-in CTA
- `/auth` — login / signup (email+password and Google)

Trainer (under the authenticated gate)
- `/dashboard` — batch KPIs: average score by module, pass %, bottom-quartile list, upcoming assessments, module completion progress
- `/modules` — M1–M7 planner: hours, topics, deliverables, weight, editable progress; module detail page with topic checklist
- `/students` — roster table with filters (batch, branch, year), per-student drill-down: module × score × attempts chart, attendance, remedial flag
- `/assessments` — create assessments, enter/import scores, view score distribution
- `/questions` — question bank with filters (module, difficulty, Bloom L1–L6, type), add/edit questions, and a paper generator that picks N questions by module/difficulty/Bloom mix and produces a printable paper + answer key
- `/coding` — coding library in the required format: Problem → Approach → Python code → Output → Complexity → Interview follow-ups, with syntax-highlighted code blocks and pattern/difficulty filters

Student
- `/dashboard` — own progress: module completion, score trend chart, weak-area callouts, next assessment
- `/modules`, `/coding` — read-only learning material and practice problems
- `/my-scores` — score history per assessment with attempt counts

### Technical notes
- TanStack Start routes; protected pages under `src/routes/_authenticated/`, public landing + `/auth` at top level.
- Data access via `createServerFn` with `requireSupabaseAuth`; role checks server-side through `has_role`, never client storage.
- Charts with Recharts; tables with shadcn table + filtering.
- Zod validation on every form; per-route `head()` metadata for SEO.

### Out of scope for v1
Auto-grading of coding submissions, in-browser code execution, file/CSV bulk import, and CO-attainment report exports — can follow once the core is running.