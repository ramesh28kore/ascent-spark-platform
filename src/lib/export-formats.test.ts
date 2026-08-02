import { describe, expect, it } from "vitest";

import { reportFilename, reportToCsvText, reportToWorkbook } from "./export-formats";
import type { ReportDoc } from "./report-builders";

const doc: ReportDoc = {
  slug: "batch",
  title: "Batch performance",
  subtitle: "Batch B1 · all modules",
  generatedAt: "2026-02-01 09:00",
  filters: ["Batch: B1", "Module: all"],
  summary: [
    { label: "Students", value: "24" },
    { label: "Average %", value: "68" },
  ],
  sections: [
    {
      name: "Students",
      columns: ["Name", "Overall %"],
      rows: [
        ["Asha, R", 80],
        ['He said "hi"', 55],
      ],
      note: "Percentages rounded.",
    },
    {
      name: "Modules",
      columns: ["Module", "Average %"],
      rows: [["M1", 72]],
    },
  ],
};

describe("reportFilename", () => {
  it("slugifies the scope and stamps today's date", () => {
    const name = reportFilename(doc, "xlsx", "Batch B1 / CSE");
    expect(name).toMatch(/^crt-batch-batch-b1-cse-\d{4}-\d{2}-\d{2}\.xlsx$/);
  });

  it("omits the scope segment when there is none", () => {
    expect(reportFilename(doc, "csv", "")).toMatch(/^crt-batch-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});

describe("reportToCsvText", () => {
  const csv = reportToCsvText(doc);
  const lines = csv.split("\n");

  it("leads with the title, subtitle, generation stamp and filters", () => {
    expect(lines[0]).toBe("Batch performance");
    expect(lines[1]).toBe("Batch B1 · all modules");
    expect(lines[2]).toBe("Generated,2026-02-01 09:00");
    expect(lines[3]).toBe("Batch: B1");
  });

  it("writes summary labels above their values", () => {
    expect(csv).toContain("Students,Average %");
    expect(csv).toContain("24,68");
  });

  it("escapes commas and quotes", () => {
    expect(csv).toContain('"Asha, R",80');
    expect(csv).toContain('"He said ""hi""",55');
  });

  it("separates sections with a blank line and appends notes", () => {
    expect(csv).toContain("\n\nStudents\nName,Overall %");
    expect(csv).toContain("Percentages rounded.");
  });
});

describe("reportToWorkbook", () => {
  it("creates an Overview sheet plus one sheet per section", () => {
    const book = reportToWorkbook(doc);
    expect(book.SheetNames).toEqual(["Overview", "Students", "Modules"]);
    expect(book.Sheets.Students.A1.v).toBe("Name");
  });

  it("de-duplicates and sanitises sheet names", () => {
    const book = reportToWorkbook({
      ...doc,
      sections: [
        { name: "Scores/2026", columns: ["A"], rows: [["1"]] },
        { name: "Scores/2026", columns: ["A"], rows: [["2"]] },
      ],
    });
    expect(book.SheetNames[1]).not.toContain("/");
    expect(new Set(book.SheetNames).size).toBe(book.SheetNames.length);
  });
});
