# CRT System — closing the roadmap gaps

## Stack note (read first)
Your roadmap assumes Next.js + Prisma + Neon + Auth.js. This project is already built and running on TanStack Start + Lovable Cloud (Postgres + auth + RLS), which covers the same responsibilities (server functions instead of route handlers, RLS instead of middleware-only guards, SQL migrations instead of Prisma). I'll implement the *substance* of the roadmap on the existing stack rather than rewriting — a stack swap would throw away the working dashboard, question bank, imports and CO/PO export.

## What already exists
- Auth (email/password + Google), auto role assignment
- Roles: trainer, student
- Modules + topics (M1–M7 syllabus), question bank with Bloom/difficulty, coding library
- Assessments + scores, dashboards, my-scores
- Bulk CSV/XLSX import, PDF/CSV export with CO/PO attainment

## What's missing (the gap list)
1. **Roles** — no `admin`, no `placement` officer
2. **Batches as real entities** — batch is just a text field on profile
3. **Session scheduler** — no sessions, no trainer allocation, no calendar
4. **Attendance** — entirely absent (a P0 item in your plan)
5. **Test engine** — students can't take a timed test; marks are trainer-entered only
6. **Practice tracker** — no problem ladder / per-student completion
7. **Readiness score** — no composite index or Ready/Near-Ready/Needs Work bands
8. **Analytics depth** — no topic-mastery heatmap or weak-area detection
9. **Resource repository** — no slides/handouts storage
10. **Notifications** — no test reminders or low-attendance alerts

## Build order

### Phase A — Foundation & operational core (P0/P1 in your plan)
- Extend `app_role` with `admin` and `placement`; trainer-manageable role assignment screen (admin/trainer only)
- `batches` table (name, academic year, branch, active) + migrate existing text batch values; roster page per batch
- `sessions` table (batch, topic, trainer, scheduled_at, duration, status PLANNED/CONDUCTED/CANCELLED) with a scheduler page: list + week calendar, create/edit, trainer allocation
- `attendance` table (unique session+student) with a fast marking screen: bulk "all present", keyboard/roll-number entry, live % per student
- Attendance % surfaced on student rows and dashboards
- Import page extended with `batches`, `sessions`, `attendance` templates

### Phase B — Assessment engine
- `tests`, `test_items`, `test_attempts` tables
- Auto paper generation from the question bank to a target Bloom/difficulty distribution (e.g. 30% L2 / 50% L3 / 20% L4+) and topic mix
- Student-facing timed test runner: server-issued start time, per-student question shuffle, autosave responses, submit
- Auto-scoring for MCQ; scores flow into the existing `scores`/analytics path
- Anti-cheat basics: item shuffle, tab-blur logging on the attempt, single-attempt enforcement

### Phase C — Insight & readiness
- `readiness_index(attendance, test_avg, coding_score, mock_rating, core_avg)` with your exact weights (15/30/30/15/10) and bands at 75 / 55 — implemented as one shared pure function used by UI, exports and any server calc
- `mock_interviews` table for the manual rating input
- Topic-mastery heatmap (students × topics), weak-area detection list per batch
- Placement-officer view: readiness board filtered by band, batch and branch
- Reports extended: readiness + attendance columns in the existing PDF/CSV and batch CO/PO export

### Phase D — Practice, resources, notifications
- `practice_problems` ladder + `practice_progress` per student (solved/attempted, difficulty-weighted score feeding readiness)
- `resources` table + file storage per session/topic (slides, handouts, solutions)
- Notifications: low-attendance and upcoming-test alerts, in-app first; email later if you want it

## Technical details
- All schema goes through migrations with GRANTs + RLS: trainer/admin write; students read learning content and only their own attendance/attempts/scores; placement officer reads roster + readiness, no edit.
- Session/attendance/test writes go through `createServerFn` with `requireSupabaseAuth`; test scoring happens server-side only (answer keys never sent to the client — the runner fetches a sanitised item payload).
- Charts stay on Recharts; exports stay on the existing jsPDF/CSV utilities.
- Existing tables aren't dropped; `profiles.batch` text is backfilled into a `batch_id` FK.

## Scope discipline
M11 resources and M12 notifications stay last, and anything outside M1–M10 goes to a backlog note rather than into this build.

Phases A–D are a lot of surface area; I'd suggest approving and shipping Phase A first, then continuing — but I can run straight through if you prefer.
