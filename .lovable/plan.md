## Goal

Add a **super admin** account (`avanthi`) that can create trainer logins and generate student logins in bulk, with usernames and passwords derived automatically from roll numbers.

## Credential rules

- Student username = `<ROLL>@<domain>`, password = `<ROLL>` exactly as typed (e.g. `23Q61A0501@gmail.com` / `23Q61A0501`).
- The domain is chosen by the admin at generation time: a dropdown with `gmail.com` plus any saved college domains, and a field to add/change a domain. Saved domains persist so the choice is remembered next time.
- Accounts are created pre-confirmed (no confirmation email), since these are placeholder addresses.
- Roll numbers are normalised to uppercase; a roll that already has an account is skipped, never duplicated.

## Super admin sign-in

The login box gets a "Username or email" field. Typing `avanthi` maps internally to a fixed reserved address; typing a full email works as before. The account is created once at setup with the password you supplied, gets the `admin` role, and is excluded from the "first signup becomes trainer" rule. Email-based password recovery will not work for this account — the password is changeable from inside the app instead.

## New Admin console (visible only to `admin`)

**1. Trainers tab**
- Form: full name, email, password (with a "generate strong password" button), optional branch.
- Creates the auth account, profile, and `trainer` role in one action.
- Table of existing trainers with reset-password and deactivate actions.
- The created credentials are shown once on screen with a copy button and a CSV download.

**2. Generate students tab** — two input modes in one screen:
- **Range mode**: prefix (e.g. `23Q61A05`), start number, end number, zero-padding width. Live preview of the first/last generated rolls and their emails before anything is created.
- **List mode**: paste roll numbers (one per line or comma-separated) or upload the existing spreadsheet template.
- Common fields applied to the whole batch: **batch**, **branch/section**, **year**, and the email domain. These are the "section-wise / batch-wise / year-wise" grouping — every generated student is tagged with them so later filtering, attendance and reports work.
- Preview table before commit showing roll, username, password, and a "already exists" flag.
- On generate: creates auth users, profiles linked to the batch, and `student` roles, then shows a result summary (created / skipped / failed) and a **Download credentials** button producing an Excel + CSV sheet of roll, username, password, batch, section, year for distribution.

**3. Existing credentials tab**
- Search students by batch/section/year, view usernames, and reset an individual student's password back to their roll number.

## Access control

- The `admin` role gains full access wherever trainers have it, plus exclusive access to the Admin console.
- All account creation happens server-side with privileged credentials; the browser never receives service keys. Every action checks the caller holds the `admin` role first, and is written to the existing audit log.
- Password values are returned once in the creation response for distribution and are never stored in the database in plain form.

## Technical notes

- New server functions in `src/lib/admin.functions.ts` using the Supabase Admin API (`createUser` with `email_confirm: true`) inside handlers, guarded by an admin-role check.
- New table `credential_settings` (or a small `app_settings` row) to persist the list of email domains and the default one.
- Role check helper extended so `admin` counts as staff in existing RLS policies.
- One-time idempotent bootstrap of the `avanthi` account; the password is stored as a backend secret and applied at creation, not committed to code.
- New route `src/routes/_authenticated/admin.tsx`, gated on the admin role, plus an "Admin" entry in the sidebar for that role.
- Bulk generation runs in chunks with per-row error capture so one bad roll doesn't abort the batch.
