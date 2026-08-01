## Goal

Give every code editor a proper language-specific starting template, and keep an automatic version history of the student's code that they can browse and restore — synced through the backend so it survives logouts and device changes.

## 1. Language templates

Add a shared template library (`src/lib/code-templates.ts`) with rich, ready-to-run boilerplate per language:

- **Python 3**: stdin reader helpers, a `solve()` stub, and a `if __name__ == "__main__"` driver with comments.
- **JavaScript**: `readFileSync(0, "utf8")` input parsing, a `solve()` stub, and output printing.

Rules for which code appears in the editor:
1. The problem's own starter code for that language, when it exists.
2. Otherwise the language template.
3. A saved snapshot/draft always wins over both.

`starterFor()` in `src/lib/problems-shared.ts` switches from its one-line comment fallback to these templates, so the practice workspace, the exam coding editor (`CodeRunner`), and the playground all share one source of truth. Switching language in the editor swaps to that language's template (or that language's last snapshot) instead of leaving stale code behind.

Also add a "Reset to template" action in the editor toolbar (with a confirm) so a student can get back to a clean scaffold.

## 2. Autosaved snapshots per attempt

New backend table `code_snapshots` holding, per student: an attempt scope (practice problem, or a test attempt + question), language, code, a label (`autosave` / `manual` / `submitted`), and a timestamp. Access is limited so a student can only read and write their own snapshots; staff keep their existing read access to graded work only.

Behaviour:
- **Autosave**: debounced (~5s idle, and on language switch / tab close). Only writes when the code actually changed since the last snapshot, so history stays meaningful.
- **Retention**: newest 20 autosaves per attempt scope; older autosaves are trimmed automatically. Snapshots created at submit time are labelled and never trimmed.
- **Resume**: opening a problem or resuming a test attempt loads the latest snapshot for that scope + language; local storage stays as an offline-first fast path but the server copy is authoritative once loaded.

## 3. Version history UI

A "History" panel in the editor (side sheet in the practice workspace at `/problems/:slug`, and a compact popover in the exam coding editor):

- List of snapshots: relative time, language, label badge (Autosave / Submitted), and first line preview.
- Selecting one shows it read-only in a preview pane with a diff-style highlight against the current buffer.
- **Restore** replaces the editor buffer, and first stores the current buffer as a snapshot so nothing is lost.
- History is per problem/question and per attempt, so an exam attempt's versions are separate from practice runs.

## Technical notes

- Migration creates `public.code_snapshots` with grants, RLS scoped to `auth.uid()` via the student's profile, an index on (student, scope, created_at), and a trigger that trims autosaves beyond 20.
- New server functions in `src/lib/snapshots.functions.ts`: `saveSnapshot`, `listSnapshots`, `latestSnapshot`, all behind `requireSupabaseAuth`; the owner is derived from the bearer token, never from the request body.
- `src/components/CodeEditor.tsx` gains an optional history/toolbar slot; snapshot logic lives in a `useCodeSnapshots` hook so both the practice workspace and `CodeRunner` reuse it.
- Exam integrity is unchanged: snapshots are code-only, carry no test cases or answers, and cannot be written for another student.

## Verification

Sign in as the QA student and check end to end: open a problem (template appears), edit and wait for autosave, reload and confirm the code returns, switch language and confirm the correct template/snapshot, open History and restore an older version, then repeat inside a coding test attempt.
