## Goal

Add a proper export toolbar to the Analytics dashboard so staff can pull **student-wise**, **batch-wise**, and **module-wise** reports in **PDF**, **Excel (.xlsx)**, and **CSV** — all from one place.

## What exists today

- `src/lib/crt-report.ts` already builds a per-student report with scores plus CO/PO attainment, and can emit **PDF** (jsPDF + autotable) and **CSV**. There is also a batch CSV summary.
- Those exports are only reachable from the Students roster and My Scores pages — the Analytics dashboard has **no export controls at all**.
- There is **no Excel export anywhere**; the `xlsx` package is installed but currently only used for bulk *import*.
- `getAnalytics` returns aggregate numbers (score distribution, weakest modules, heatmap, proctoring flags) but not the row-level data needed for a module-wise report.

## What gets built

### 1. Report data
Extend the analytics server function with a companion `getReportData` server function (staff-only, same auth middleware) that returns the rows the three report types need: students with their batch, modules, assessments, scores, attempts, coding submissions, and attendance.

### 2. Three report builders
A new `src/lib/report-builders.ts` producing a shared, format-agnostic table shape (title, subtitle, columns, rows, summary lines) for:

- **Student-wise** — one row per student: batch, attendance %, weekly-test avg, coding avg, mock rating, overall readiness index and colour band, plus a per-module percentage column set.
- **Batch-wise** — one row per batch: headcount, average readiness, band distribution (ready / borderline / at-risk counts), attendance %, average test and coding scores, and top/bottom performers.
- **Module-wise** — one row per module (M1–M12): mapped CO, weight, attempts, average attainment %, attainment level 0–3, weakest topics, and count of students below threshold.

Readiness numbers reuse the existing `computeReadiness` weighting (15/30/30/15/10) so exports always match what's on screen.

### 3. Three output formats
A new `src/lib/export-formats.ts` that turns any report table into:

- **CSV** — plain download, reusing the existing `downloadText` helper.
- **Excel** — `xlsx` workbook with one sheet per report section, a bold header row, frozen top row, and sized columns. Batch export gets a Summary sheet plus one sheet per batch.
- **PDF** — landscape A4 via jsPDF + autotable, with the console header, generated-on date, filters applied, striped tables, page numbers, and colour-coded readiness bands.

### 4. Export Centre UI on the analytics page
A new `src/components/ExportCentre.tsx` card added to `src/routes/_authenticated/analytics.tsx`:

- Report-type selector: Student-wise / Batch-wise / Module-wise.
- Filters: batch, module, and date range (applies to scores and attempts).
- Three buttons — **PDF**, **Excel**, **CSV** — each showing a spinner while the report is generated.
- A short preview table of the first rows so the user sees what they will get before downloading.
- Filenames follow `crt-<type>-<filter>-<YYYY-MM-DD>.<ext>`.

Existing per-student PDF/CSV exports on the Students and My Scores pages stay exactly as they are.

## Technical notes

- All generation runs client-side from data fetched by one authenticated server function; no new tables, no schema migration.
- Access is limited to trainer / admin / placement roles, matching the rest of the analytics page; a student hitting the route still only sees their own data through RLS.
- `xlsx` and `jspdf` are already dependencies, so no new packages.
