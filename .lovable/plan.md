## Goal

The super admin (`avanthi`) should do exactly two things: create trainer/staff logins and generate student credentials — plus keep the Roles & access page. Everything else in the console (training data, tests, analytics, students, etc.) becomes invisible *and* unreadable to that role.

## 1. Navigation and app shell

- Super admin gets its own sidebar: **Admin console** and **Roles & access** only. No dashboard, batches, modules, tests, analytics, students, alerts, imports.
- Role badge stays "Super Admin".
- Landing after sign-in goes to the Admin console instead of the dashboard.

## 2. Route guarding

- Any protected route outside `/admin` and `/roles` redirects a super admin back to `/admin`, so a typed URL or stale bookmark can't open a training page.
- Trainers, placement staff and students are unaffected.

## 3. Permission model change

Today the `admin` role is treated as staff everywhere, which is why it can see all training data. Change the shared role helpers so:

- "staff" means trainer only.
- "can view all" means trainer or placement only.
- A new admin-only check is used for the few things the super admin genuinely needs.

Access rules updated so the super admin keeps:

- reading and managing role assignments (Roles & access),
- reading profile name/roll/email rows needed by the credentials directory,
- reading the audit log and the email-domain settings.

And loses direct access to: batches, sessions, attendance, modules, questions, coding problems, tests, attempts, scores, certificates, resources, announcements, rubrics and every other training table.

The Admin console itself keeps working because account creation runs through a privileged server path, not the caller's own permissions.

## 4. Verification

Sign in as `avanthi` and confirm: sidebar shows only the two entries, `/dashboard` and `/students` bounce to `/admin`, generating credentials and creating a trainer still succeed, and Roles & access still lists users. Then sign in as a trainer to confirm nothing regressed.

## Technical notes

- `src/components/AppShell.tsx`: add a dedicated `adminNav`; select it when `me.isAdmin`.
- `src/lib/crt.functions.ts` (`me`): `isStaff` / `canViewAll` no longer include `admin`; keep `isAdmin`.
- `src/routes/_authenticated/route.tsx`: client-side redirect for admins on non-admin paths; `/dashboard` also handles the admin redirect.
- Migration: redefine `private.is_staff` and `private.can_view_all` without `'admin'`; add `private.is_admin(uuid)`; update policies on `profiles` (SELECT), `user_roles` (SELECT), `audit_logs` (SELECT) and `credential_settings` (SELECT) to also allow `private.is_admin(auth.uid())`. Role writes already use `private.has_role(..., 'admin')`.
- `src/lib/crt-ops.functions.ts` role-management fns: verify they gate on admin rather than staff after the change.
