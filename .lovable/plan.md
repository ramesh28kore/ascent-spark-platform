## Goal

A minimal CI pipeline that blocks merges when TypeScript, lint, or migration hygiene checks fail.

## What gets added

**1. `typecheck` script in `package.json`**
Currently only `dev`, `build`, `lint`, `format` exist. Add:
- `"typecheck": "tsc --noEmit"`
- `"check:migrations": "node scripts/check-migrations.mjs"`
- `"ci": "npm run typecheck && npm run lint && npm run check:migrations"`

**2. `scripts/check-migrations.mjs`** — a dependency-free Node script that scans `supabase/migrations/*.sql` and fails with a clear message on:
- A `CREATE TABLE public.<x>` with no `GRANT ... ON public.<x>` in the same file.
- A `CREATE TABLE public.<x>` with no `ENABLE ROW LEVEL SECURITY` for that table.
- A table with RLS enabled but zero `CREATE POLICY` on it in that file.
- Filenames not matching the `YYYYMMDDHHMMSS_*.sql` timestamp pattern, or duplicate timestamps.
- Forbidden edits to protected schemas (`auth`, `storage`, `realtime`, `vault`, `supabase_functions`).

It only reads files — it never connects to the database, so CI needs no secrets.

**3. `.github/workflows/ci.yml`** — runs on `pull_request` and pushes to the default branch:
- checkout → setup-node 20 with npm cache → `npm ci`
- three separate steps (typecheck, lint, migrations) so the failing one is obvious in the PR checks list
- concurrency group that cancels superseded runs on the same branch

## Technical notes

- Lint is run as-is (`eslint .`). If the existing codebase has pre-existing lint errors, CI would go red on day one — I'll run lint and typecheck locally first and report the count. If there are pre-existing failures, the options are: fix them, or start lint as non-blocking (`continue-on-error`) and tighten later. I'll ask before choosing.
- The migration checker is heuristic (regex over SQL text) and intentionally lenient: it only flags tables created in the file being scanned, so historical `ALTER`-only migrations pass.
- No new dependencies are installed.

## Files

- `package.json` (scripts only)
- `scripts/check-migrations.mjs` (new)
- `.github/workflows/ci.yml` (new)
