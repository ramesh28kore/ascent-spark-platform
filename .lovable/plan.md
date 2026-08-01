## Goal

Make the student experience feel like one coherent, LeetCode-style product: a grouped, self-explanatory sidebar and identical page framing on every student page.

## What's inconsistent today (verified)

- The student sidebar is one flat list of 15 items with no grouping, and three different destinations (Practice ladder, Playground, Coding library) all use the same `Code2` icon.
- Page titles are styled four different ways: `font-display text-2xl font-bold` (Coding library, My scores, Modules), `font-display text-2xl font-semibold` (Practice, Resources, Schedule), and plain `text-2xl font-semibold` with no display font (Playground, Certificates).
- Only the sidebar footer offers sign-out; there is no account/profile entry point, and "My progress" (the LeetCode-style profile at `/problems/profile`) is reachable only from inside the problem set.

## Sidebar restructure (student role)

Replace the flat list with labelled groups, each collapsible, with the group containing the active route open by default:

```text
LEARN        Dashboard · Modules · Schedule · Resources
PRACTICE     Problem set · Study plans · Contests · Practice ladder · Playground
ASSESS       Online tests · Assessments · My scores · Certificates
YOU          My progress · Alerts
```

- Distinct icons per item (Braces / Target / Trophy / ListChecks / TerminalSquare / Timer / ClipboardList / LineChart / Award / UserRound / Bell) — no repeated icons.
- "Coding library" folds under Practice as a secondary link rather than a top-level peer, so the three code-ish entries stop competing.
- Active state matches nested routes too (`/problems/plans/xyz` keeps "Study plans" highlighted), not just exact equality as it does now.
- Alerts shows its unread count as a sidebar badge, mirroring the header bell.
- Icon-collapsed mode keeps tooltips so every item stays identifiable at `w-14`.
- Staff, placement and admin navs keep their current items; staff simply gets the same grouping treatment so the shell has one implementation.

## LeetCode-style consistency layer

Add a small shared `PageHeader` component (title, one-line description, optional right-side actions, optional breadcrumb) and apply it to every student page: Dashboard, Modules, Schedule, Online tests, Assessments, Problem set, Study plans, Contests, Practice ladder, Playground, Coding library, Certificates, Resources, Alerts, My scores, My progress. One heading treatment everywhere (`font-display text-2xl font-bold tracking-tight`), one description tone, consistent spacing.

Alongside it, per-page polish so each screen reads like the problem set:

- **Difficulty and status chips** use the existing `LEVEL_TONE` / `VERDICT_TONE` tokens everywhere they appear (practice ladder, coding library, contests), instead of ad-hoc colours.
- **Empty states** get a consistent icon + sentence + primary action ("No submissions yet — solve today's challenge") rather than bare grey text.
- **Loading states** use skeletons shaped like the final content on every page.
- **Streak / solved counters** from the dashboard appear as a compact strip in the sidebar footer (solved count + streak flame), the way LeetCode surfaces progress persistently.
- **Header**: add an avatar menu (name, role, My progress, Sign out) so account actions live in one predictable place; keep the bell.

## Technical notes

- Work is confined to `src/components/AppShell.tsx`, a new `src/components/PageHeader.tsx`, and the header/empty/loading blocks of the student route files under `src/routes/_authenticated/`. No schema, server-function or query changes.
- Sidebar groups use shadcn `SidebarGroup` + `Collapsible` with `defaultOpen` derived from the current pathname via `useRouterState`.
- All colour usage stays on semantic tokens; no hardcoded colour utilities.
- Sidebar progress strip reuses the existing `problemProfileQuery` already used by `/problems/profile`, so no new data fetching.

## Verification

Sign in as the QA student and screenshot each sidebar group's pages at desktop and mobile widths, confirming: identical header treatment, correct active highlighting on nested routes, working collapse/expand, tooltips in icon mode, and no console errors.
