/**
 * Renders a `ReportDoc` to PDF, Excel or CSV and triggers a browser download.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import { downloadText } from "@/lib/crt-report";
import type { ReportDoc } from "@/lib/report-builders";

const NAVY: [number, number, number] = [15, 42, 74];
const STEEL: [number, number, number] = [27, 75, 122];
const MIST: [number, number, number] = [244, 246, 249];

export type ExportFormat = "pdf" | "xlsx" | "csv";

export function reportFilename(doc: ReportDoc, format: ExportFormat, scope: string) {
  const day = new Date().toISOString().slice(0, 10);
  const tail = scope
    ? `-${scope
        .toLowerCase()
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-|-$/g, "")}`
    : "";
  return `crt-${doc.slug}${tail}-${day}.${format}`;
}

/* -------------------------------------------------------------------- CSV */

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function reportToCsvText(doc: ReportDoc): string {
  const lines: unknown[][] = [[doc.title], [doc.subtitle], ["Generated", doc.generatedAt]];
  doc.filters.forEach((f) => lines.push([f]));
  lines.push([]);
  lines.push(doc.summary.map((s) => s.label));
  lines.push(doc.summary.map((s) => s.value));

  for (const section of doc.sections) {
    lines.push([]);
    lines.push([section.name]);
    lines.push(section.columns);
    section.rows.forEach((row) => lines.push(row));
    if (section.note) lines.push([section.note]);
  }
  return lines.map((row) => row.map(csvCell).join(",")).join("\n");
}

/* ------------------------------------------------------------------ Excel */

export function reportToWorkbook(doc: ReportDoc): XLSX.WorkBook {
  const book = XLSX.utils.book_new();

  const overview: unknown[][] = [
    [doc.title],
    [doc.subtitle],
    ["Generated", doc.generatedAt],
    [],
    ...doc.filters.map((f) => [f]),
    [],
    ["Metric", "Value"],
    ...doc.summary.map((s) => [s.label, s.value]),
  ];
  const overviewSheet = XLSX.utils.aoa_to_sheet(overview);
  overviewSheet["!cols"] = [{ wch: 34 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(book, overviewSheet, "Overview");

  const used = new Set(["Overview"]);
  for (const section of doc.sections) {
    const aoa: unknown[][] = [section.columns, ...section.rows];
    if (section.note) aoa.push([], [section.note]);
    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    sheet["!freeze"] = { xSplit: "0", ySplit: "1" };
    sheet["!cols"] = section.columns.map((column, index) => {
      const widest = section.rows.reduce(
        (max, row) => Math.max(max, String(row[index] ?? "").length),
        column.length,
      );
      return { wch: Math.min(46, Math.max(10, widest + 2)) };
    });
    section.columns.forEach((_, index) => {
      const ref = XLSX.utils.encode_cell({ r: 0, c: index });
      if (sheet[ref]) sheet[ref].s = { font: { bold: true } };
    });

    let name = section.name.replace(/[\\/?*[\]:]/g, " ").slice(0, 28) || "Sheet";
    let n = 2;
    while (used.has(name)) name = `${name.slice(0, 26)} ${n++}`;
    used.add(name);
    XLSX.utils.book_append_sheet(book, sheet, name);
  }
  return book;
}

/* -------------------------------------------------------------------- PDF */

export function reportToPdfDoc(doc: ReportDoc) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const width = pdf.internal.pageSize.getWidth();

  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, width, 64, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.text(doc.title, 40, 28);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(doc.subtitle, 40, 44);
  pdf.text(`CRT Training Console · generated ${doc.generatedAt}`, 40, 56);

  pdf.setTextColor(60, 60, 60);
  pdf.setFontSize(9);
  pdf.text(doc.filters.join("   |   "), 40, 82);

  autoTable(pdf, {
    startY: 94,
    head: [doc.summary.map((s) => s.label)],
    body: [doc.summary.map((s) => s.value)],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: STEEL, textColor: 255, fontStyle: "bold" },
    bodyStyles: { fontStyle: "bold", textColor: NAVY },
  });

  const lastY = () =>
    (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 94;

  let extra = 0;
  for (const section of doc.sections) {
    const top = lastY() + 24 + extra;
    extra = 0;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(...NAVY);
    pdf.text(section.name, 40, top);

    autoTable(pdf, {
      startY: top + 8,
      head: [section.columns],
      body: section.rows.map((row) => row.map((cell) => String(cell ?? ""))),
      theme: "striped",
      styles: { fontSize: 7.5, cellPadding: 3, overflow: "linebreak" },
      headStyles: { fillColor: NAVY, textColor: 255, fontSize: 7.5 },
      alternateRowStyles: { fillColor: MIST },
      margin: { left: 40, right: 40 },
      didParseCell: (hook) => {
        if (hook.section !== "body") return;
        const text = String(hook.cell.raw ?? "");
        if (text === "Ready" || text === "On track") hook.cell.styles.textColor = [21, 110, 62];
        if (text === "Near-Ready" || text === "Watch") hook.cell.styles.textColor = [161, 98, 7];
        if (text === "Needs Work" || text === "Critical")
          hook.cell.styles.textColor = [176, 32, 32];
      },
    });

    if (section.note) {
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(7.5);
      pdf.setTextColor(110, 110, 110);
      pdf.text(section.note, 40, lastY() + 12);
      extra = 10;
    }
  }

  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(130, 130, 130);
    pdf.text(`Page ${page} of ${pages}`, width - 40, pdf.internal.pageSize.getHeight() - 18, {
      align: "right",
    });
  }
  return pdf;
}

/* ----------------------------------------------------------------- export */

export function exportReport(doc: ReportDoc, format: ExportFormat, scope = "") {
  const filename = reportFilename(doc, format, scope);
  if (format === "csv") {
    downloadText(filename, reportToCsvText(doc), "text/csv");
    return filename;
  }
  if (format === "xlsx") {
    XLSX.writeFile(reportToWorkbook(doc), filename);
    return filename;
  }
  reportToPdfDoc(doc).save(filename);
  return filename;
}
