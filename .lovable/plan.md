## Goal
Clear out every trainer and student account, keeping only the super admin (`avanthi@crtconsole.app`).

## Current state (verified)
- 17 profiles exist; 7 are linked to real logins, 10 are demo/imported records with no login.
- Only one role row exists in total, and it is the super admin's `admin` role.
- Dependent data present: 71 score rows, 3 test attempts, 1 certificate; attendance and coding submissions are already empty.

## What will be removed
1. All profiles except the super admin's (16 rows), including the 10 demo students loaded earlier.
2. Their dependent rows first, so nothing is left orphaned: scores, test attempts, certificates, practice progress, bookmarks, theory answers, coding submissions, rubric scores, mock interviews, attendance, discussion posts, snippets.
3. Their logins: the 6 non-admin auth accounts are removed through the existing super-admin delete flow, which also writes an audit-log entry. Logins can't be deleted from SQL, so this step runs through the app's admin delete function.

## What stays
- The super admin login, profile and `admin` role.
- All shared content: modules, topics, question bank, coding problems, practice problems, tests, assessments, batches, sessions, resources, announcements, credential settings and audit logs.

## Steps
1. Run a data-removal statement that deletes the dependent rows above for every non-super-admin profile, then the profiles themselves.
2. Call the existing `deleteAccounts` admin function for the 6 remaining non-admin logins so the auth accounts disappear too and the action is audited.
3. Verify: profiles count = 1, user_roles = 1 (admin), no leftover scores/attempts/certificates.

## Note
This is irreversible — the demo students and the two personal Gmail accounts go away as well. Say so if any of those should be kept.
