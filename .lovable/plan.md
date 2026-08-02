## Goal

Two additions to CI so a PR cannot merge if the production build breaks or tests fail:
1. A full `npm run build` step.
2. A separate job running unit/integration tests with coverage.

## 1. Production build in CI

Add a `Production build` step to the existing `checks` job, after lint/migration checks (build is the slowest step, so cheap checks fail first). It runs `npm run build` (Vite + Nitro Cloudflare output) and fails the job on any non-zero exit.

Build needs the `VITE_*` env vars that the app reads at build time (Supabase URL, publishable key, project ID). These are publishable, not secret, so CI will supply them as plain workflow `env:` values matching the current `.env` so the build resolves without pulling real secrets. No server-side secrets are used at build time.

Caching: reuse the existing `node_modules` cache and add a Vite build cache (`node_modules/.vite`) to the existing restore/save cache pair.

## 2. Test job with coverage

Currently the project has no test runner and no test files. This adds:

- **Vitest + coverage**: dev deps `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`.
- **`vitest.config.ts`**: jsdom environment, `@/` path alias, `src/**/*.test.ts(x)` include, v8 coverage reporting text + lcov, coverage scoped to `src/lib/**` (pure logic) so generated and UI-heavy files don't distort numbers.
- **Scripts**: `test` (`vitest run`) and `test:coverage` (`vitest run --coverage`).

**Initial test suite** — targeting the pure business logic that already exists, so the job is meaningful from day one rather than a green no-op:

| File under test | What is covered |
| --- | --- |
| `src/lib/readiness.ts` | 15/30/30/15/10 weighting, clamping, missing-component handling |
| `src/lib/crt-report.ts` | CO/PO attainment mapping and attainment thresholds |
| `src/lib/achievements.ts` | badge unlock rules and `computeAchievementTimeline` ordering |
| `src/lib/problem-presets.ts` | preset → filter-state expansion |
| `src/lib/export-formats.ts` | CSV row/escaping shape |

One integration-style component test (`ProblemFilters` via Testing Library) to prove the jsdom setup works end to end.

Exact assertions get written against the real current behaviour of each module — tests describe what the code does today, not an assumed spec.

**Workflow job**: a new `tests` job in `.github/workflows/ci.yml`, running in parallel with `checks`, sharing the same Node 20 setup and `node_modules` cache key. It runs `npm run test:coverage` and uploads the `coverage/` directory as an artifact. No coverage threshold gate initially — the job fails only on failing tests; a threshold can be added once a baseline exists.

## After merging

Branch protection on `main` must be updated to require both checks: `Typecheck, lint, migrations` and the new `Tests` job.

## Technical notes

- No app/source behaviour changes; only config, CI, and new test files.
- `vitest.config.ts` stays separate from `vite.config.ts` to avoid loading the TanStack Start / Nitro plugin chain in the test run.
- `tsconfig.json` `include` gains the test files and `vitest.config.ts` so typecheck covers them.
- `eslint.config.js` gets vitest globals for `**/*.test.ts(x)`.
