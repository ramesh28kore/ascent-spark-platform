## Goal

Cut PR CI time by caching dependency installs and reusing incremental TypeScript/ESLint state between runs.

## Changes

**1. `tsconfig.json`** — enable incremental output so `tsc --noEmit` can skip unchanged files:
- `"incremental": true`
- `"tsBuildInfoFile": "node_modules/.cache/tsc/tsconfig.tsbuildinfo"`

(TypeScript 5.8 supports `incremental` together with `noEmit`.)

**2. `package.json`**
- `typecheck`: keep `tsc --noEmit` (now incremental via tsconfig).
- `lint`: `eslint . --cache --cache-location node_modules/.cache/eslint/`

**3. `.github/workflows/ci.yml`**
- Keep `actions/setup-node@v4` with `cache: npm` (npm download cache), and swap `npm ci` to run only when the install cache misses:
  - `actions/cache` on `node_modules` keyed by `${{ runner.os }}-node20-${{ hashFiles('package-lock.json') }}`
  - `npm ci` runs with `if: steps.node-modules-cache.outputs.cache-hit != 'true'`
- New `actions/cache` step for `node_modules/.cache/tsc` and `node_modules/.cache/eslint`, keyed by lockfile + `github.sha`, with restore-keys falling back to the newest prior cache on the branch, then `main`. This gives a warm-but-stale buildinfo that TS/ESLint validate and partially reuse.
- Cache steps placed before the install step; the tsc/eslint cache step needs `save-always`-style behaviour, so it uses the split `actions/cache/restore` + `actions/cache/save` pair so state is saved even when typecheck fails.

## Technical notes

- Caching `node_modules` directly is the big win here (skips the `npm ci` install entirely on lockfile-unchanged PRs); the `setup-node` npm cache still covers cache-miss installs.
- The cache key must include the lockfile hash — a stale `node_modules` against a changed lockfile is the classic failure mode, and the key prevents it. No `restore-keys` fallback on the `node_modules` key for that reason.
- `.eslintcache`/tsbuildinfo live under `node_modules/.cache/`, which is already gitignored, so nothing new needs ignoring.
- Migration check stays uncached — it's a fast file scan.

## Files

- `.github/workflows/ci.yml`
- `package.json` (lint script)
- `tsconfig.json` (incremental flags)
