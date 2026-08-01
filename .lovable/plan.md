## Goal

Upgrade the Problem set page (`/problems`) from its current four single-select filters into a LeetCode-style filter bar: multi-select topic tags, company filter, difficulty and status toggles, favourites, sortable columns, saved presets, and shareable URLs.

## What already exists

The page today has: text search, one difficulty select, one topic select, one status select, a favourites toggle, and a static table ordered by `sort_order`. All state is local component state — nothing survives a refresh or can be shared.

## What gets built

**1. Filter bar (replaces the current row of selects)**

- Difficulty: segmented Easy / Medium / Hard toggles, multi-select (LeetCode style) instead of a single dropdown.
- Topic tags: multi-select popover with a search box and counts per tag; selected tags render as removable chips under the bar. Match mode "any tag" by default.
- Status: All / Todo / Attempted / Solved.
- Company: dropdown built from the company values on the problems.
- Favourites: existing star toggle, kept.
- Search box: kept, matches title, tags and company.
- "Clear all" button plus a live result count ("42 of 137 problems").

**2. Sorting**

Clickable table headers with asc/desc arrows on: #, Title, Acceptance, Difficulty (easy→hard order, not alphabetical), and Status. Default stays the curated `sort_order`. Adds a Frequency-like "Most solved" option using the acceptance/attempt counts already returned by the server.

**3. Presets**

A row of one-click preset chips that set several filters at once:

- Top interview picks (favourites + company tagged)
- Unsolved easy warm-up
- Needs another go (attempted, not solved)
- Hard grind (hard + unsolved)
- Company focus (opens the company dropdown)

Selecting a preset fills the filter bar; the user can then tweak any field, which drops the preset back to "Custom".

**4. Shareable / sticky state**

All filters and the sort live in the URL search params, validated with the router's `validateSearch` + `fallback()`. Refreshing keeps the view, and a filtered list can be copy-pasted to a peer. Last-used filters are not otherwise persisted.

**5. Empty state**

When filters match nothing, show a short message with a "Clear filters" action instead of the current bare line.

## Technical notes

- All filtering and sorting stay client-side over the existing `problemsQuery` payload — no new server functions, no database changes. The list already carries `level`, `status`, `tags`, `category`, `company` and `acceptance`.
- New route search schema on `src/routes/_authenticated/problems.index.tsx` using `zodValidator` + `fallback` (arrays for `levels` and `tags`, strings for `status`, `company`, `sort`, `dir`, `q`, boolean for `fav`).
- Extract the filter bar into `src/components/leetcode/ProblemFilters.tsx` and the presets into `src/lib/problem-presets.ts` so the page component stays readable.
- Reuse existing shadcn primitives (Popover, Command, Toggle Group, Badge); no new dependencies.
