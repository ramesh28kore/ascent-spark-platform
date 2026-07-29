import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type ModuleRow = {
  id: string;
  code: string;
  title: string;
  weight_percent: number;
};

export type AssessmentRow = {
  id: string;
  title: string;
  kind: string;
  module_id: string | null;
  max_marks: number;
  scheduled_on: string;
};

export type ScoreRow = {
  id: string;
  student_id: string;
  assessment_id: string;
  marks: number | string;
  attempts: number;
  recorded_at: string;
};

export type StudentRow = {
  id: string;
  full_name: string;
  roll_number: string | null;
  branch: string | null;
  batch: string | null;
  year: string | null;
  email: string | null;
};

/** Course outcomes mapped 1:1 onto the M1–M7 CRT modules. */
export const CO_DEFINITIONS: Record<
  string,
  { co: string; statement: string; pos: Record<string, 1 | 2 | 3> }
> = {
  M1: {
    co: "CO1",
    statement: "Apply core programming constructs to solve computational problems.",
    pos: { PO1: 3, PO2: 2, PO3: 1, PO5: 2, PSO1: 3 },
  },
  M2: {
    co: "CO2",
    statement: "Select and implement appropriate data structures for a given problem.",
    pos: { PO1: 3, PO2: 3, PO3: 2, PO5: 2, PSO1: 3 },
  },
  M3: {
    co: "CO3",
    statement: "Design and analyse algorithms for correctness and complexity.",
    pos: { PO1: 3, PO2: 3, PO4: 2, PO5: 1, PSO1: 3 },
  },
  M4: {
    co: "CO4",
    statement: "Explain CS core concepts in DBMS, OS, CN and OOPs contexts.",
    pos: { PO1: 3, PO2: 2, PO4: 2, PSO2: 3 },
  },
  M5: {
    co: "CO5",
    statement: "Solve quantitative, logical and verbal reasoning problems under time limits.",
    pos: { PO1: 2, PO2: 3, PO9: 1, PO12: 2 },
  },
  M6: {
    co: "CO6",
    statement: "Apply company-specific patterns to clear placement screening rounds.",
    pos: { PO2: 2, PO5: 2, PO11: 2, PO12: 3, PSO2: 2 },
  },
  M7: {
    co: "CO7",
    statement: "Communicate technical work effectively in interviews and HR rounds.",
    pos: { PO8: 2, PO9: 3, PO10: 3, PO12: 3 },
  },
};

export const PO_LIST = [
  "PO1",
  "PO2",
  "PO3",
  "PO4",
  "PO5",
  "PO8",
  "PO9",
  "PO10",
  "PO11",
  "PO12",
  "PSO1",
  "PSO2",
];

/** Attainment level from percentage: 3 = ≥70%, 2 = ≥60%, 1 = ≥50%, 0 = below target. */
export function attainmentLevel(percent: number): 0 | 1 | 2 | 3 {
  if (percent >= 70) return 3;
  if (percent >= 60) return 2;
  if (percent >= 50) return 1;
  return 0;
}

export type ScoreDetail = {
  assessment: string;
  kind: string;
  date: string;
  module: string;
  marks: number;
  max: number;
  percent: number;
  attempts: number;
};

export type CoAttainment = {
  module: string;
  moduleTitle: string;
  co: string;
  statement: string;
  weight: number;
  tests: number;
  percent: number;
  level: 0 | 1 | 2 | 3;
};

export type StudentReport = {
  student: StudentRow;
  generatedAt: string;
  details: ScoreDetail[];
  overallPercent: number;
  totalAttempts: number;
  coRows: CoAttainment[];
  poRows: { po: string; percent: number; level: number }[];
};

export function buildStudentReport(
  student: StudentRow,
  modules: ModuleRow[],
  assessments: AssessmentRow[],
  scores: ScoreRow[],
): StudentReport {
  const mine = scores.filter((s) => s.student_id === student.id);

  const details: ScoreDetail[] = mine
    .map((s) => {
      const a = assessments.find((x) => x.id === s.assessment_id);
      const mod = modules.find((m) => m.id === a?.module_id);
      const marks = Number(s.marks);
      const max = a?.max_marks ?? 0;
      return {
        assessment: a?.title ?? "Assessment",
        kind: a?.kind ?? "—",
        date: a?.scheduled_on ?? "",
        module: mod ? `${mod.code} · ${mod.title}` : "General",
        marks,
        max,
        percent: max ? Math.round((marks / max) * 100) : 0,
        attempts: s.attempts,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const overallPercent = details.length
    ? Math.round(details.reduce((sum, d) => sum + d.percent, 0) / details.length)
    : 0;

  const coRows: CoAttainment[] = modules.map((m) => {
    const rows = details.filter((d) => d.module.startsWith(`${m.code} ·`));
    const percent = rows.length
      ? Math.round(rows.reduce((s, r) => s + r.percent, 0) / rows.length)
      : 0;
    const def = CO_DEFINITIONS[m.code] ?? {
      co: m.code,
      statement: m.title,
      pos: {} as Record<string, 1 | 2 | 3>,
    };
    return {
      module: m.code,
      moduleTitle: m.title,
      co: def.co,
      statement: def.statement,
      weight: m.weight_percent,
      tests: rows.length,
      percent,
      level: attainmentLevel(percent),
    };
  });

  // PO attainment = correlation-weighted average of the COs that map to it.
  const poRows = PO_LIST.map((po) => {
    let weighted = 0;
    let weightSum = 0;
    for (const row of coRows) {
      if (!row.tests) continue;
      const corr = CO_DEFINITIONS[row.module]?.pos[po];
      if (!corr) continue;
      weighted += row.percent * corr;
      weightSum += corr;
    }
    const percent = weightSum ? Math.round(weighted / weightSum) : 0;
    return { po, percent, level: attainmentLevel(percent) };
  }).filter((p) => p.percent > 0);

  return {
    student,
    generatedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    details,
    overallPercent,
    totalAttempts: details.reduce((s, d) => s + d.attempts, 0),
    coRows,
    poRows,
  };
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function reportToCsv(report: StudentReport): string {
  const lines: string[][] = [
    ["CRT Student Report"],
    ["Name", report.student.full_name],
    ["Roll number", report.student.roll_number ?? "—"],
    ["Branch", report.student.branch ?? "—"],
    ["Batch", report.student.batch ?? "—"],
    ["Overall average %", String(report.overallPercent)],
    ["Total attempts", String(report.totalAttempts)],
    ["Generated", report.generatedAt],
    [],
    ["Assessment history"],
    ["Assessment", "Type", "Date", "Module", "Marks", "Max", "%", "Attempts"],
    ...report.details.map((d) => [
      d.assessment,
      d.kind,
      d.date,
      d.module,
      String(d.marks),
      String(d.max),
      String(d.percent),
      String(d.attempts),
    ]),
    [],
    ["CO attainment"],
    ["Module", "CO", "Statement", "Weight %", "Tests", "Attainment %", "Level (0-3)"],
    ...report.coRows.map((c) => [
      `${c.module} · ${c.moduleTitle}`,
      c.co,
      c.statement,
      String(c.weight),
      String(c.tests),
      String(c.percent),
      String(c.level),
    ]),
    [],
    ["PO / PSO attainment"],
    ["Outcome", "Attainment %", "Level (0-3)"],
    ...report.poRows.map((p) => [p.po, String(p.percent), String(p.level)]),
  ];
  return lines.map((row) => row.map(csvCell).join(",")).join("\n");
}

export function batchToCsv(reports: StudentReport[]): string {
  const header = [
    "Name",
    "Roll number",
    "Branch",
    "Batch",
    "Tests taken",
    "Attempts",
    "Overall %",
    ...Object.values(CO_DEFINITIONS).map((c) => `${c.co} %`),
    ...PO_LIST.map((p) => `${p} %`),
  ];
  const rows = reports.map((r) => [
    r.student.full_name,
    r.student.roll_number ?? "",
    r.student.branch ?? "",
    r.student.batch ?? "",
    String(r.details.length),
    String(r.totalAttempts),
    String(r.overallPercent),
    ...r.coRows.map((c) => String(c.percent)),
    ...PO_LIST.map((po) => String(r.poRows.find((p) => p.po === po)?.percent ?? 0)),
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const NAVY: [number, number, number] = [15, 42, 74];
const STEEL: [number, number, number] = [27, 75, 122];

export function buildPdfDoc(report: StudentReport) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 76, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("CRT Student Performance Report", 40, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Campus Recruitment Training  |  Generated ${report.generatedAt}`, 40, 54);

  doc.setTextColor(20, 20, 20);
  autoTable(doc, {
    startY: 96,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 3 },
    body: [
      ["Student", report.student.full_name, "Roll number", report.student.roll_number ?? "—"],
      ["Branch", report.student.branch ?? "—", "Batch", report.student.batch ?? "—"],
      [
        "Overall average",
        `${report.overallPercent}%`,
        "Assessments / attempts",
        `${report.details.length} / ${report.totalAttempts}`,
      ],
    ],
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 100 },
      2: { fontStyle: "bold", cellWidth: 120 },
    },
  });

  const section = (title: string) => {
    const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text(title, 40, y);
    doc.setTextColor(20, 20, 20);
    return y + 8;
  };

  autoTable(doc, {
    startY: section("1. Assessment history"),
    head: [["Assessment", "Type", "Date", "Module", "Marks", "%", "Attempts"]],
    body: report.details.length
      ? report.details.map((d) => [
          d.assessment,
          d.kind.replace(/_/g, " "),
          d.date,
          d.module,
          `${d.marks}/${d.max}`,
          `${d.percent}%`,
          String(d.attempts),
        ])
      : [["No assessments recorded", "", "", "", "", "", ""]],
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: STEEL, textColor: 255 },
    alternateRowStyles: { fillColor: [244, 246, 249] },
  });

  autoTable(doc, {
    startY: section("2. Course outcome (CO) attainment"),
    head: [["Module", "CO", "Statement", "Wt %", "Tests", "Attainment", "Level"]],
    body: report.coRows.map((c) => [
      c.module,
      c.co,
      c.statement,
      String(c.weight),
      String(c.tests),
      `${c.percent}%`,
      String(c.level),
    ]),
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
    columnStyles: { 2: { cellWidth: 200 } },
    headStyles: { fillColor: STEEL, textColor: 255 },
    alternateRowStyles: { fillColor: [244, 246, 249] },
  });

  autoTable(doc, {
    startY: section("3. Programme outcome (PO / PSO) attainment"),
    head: [["Outcome", "Attainment", "Level", "Outcome", "Attainment", "Level"]],
    body: (() => {
      const rows: string[][] = [];
      for (let i = 0; i < report.poRows.length; i += 2) {
        const a = report.poRows[i];
        const b = report.poRows[i + 1];
        rows.push([
          a.po,
          `${a.percent}%`,
          String(a.level),
          b ? b.po : "",
          b ? `${b.percent}%` : "",
          b ? String(b.level) : "",
        ]);
      }
      return rows.length ? rows : [["—", "", "", "", "", ""]];
    })(),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: STEEL, textColor: 255 },
    alternateRowStyles: { fillColor: [244, 246, 249] },
  });

  const footY =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 22;
  doc.setFontSize(7.5);
  doc.setTextColor(110, 110, 110);
  doc.text(
    "Attainment levels: 3 = 70% and above, 2 = 60-69%, 1 = 50-59%, 0 = below target. PO attainment is the correlation-weighted average of mapped COs.",
    40,
    footY,
    { maxWidth: pageWidth - 80 },
  );

  return doc;
}

export function reportToPdf(report: StudentReport) {
  const slug = (report.student.roll_number || report.student.full_name)
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase();
  buildPdfDoc(report).save(`crt-report-${slug}.pdf`);
}
