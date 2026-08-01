import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, FileSpreadsheet, FileText, Loader2, Table2 } from "lucide-react";

import { getReportData } from "@/lib/exams.functions";
import {
  buildReport,
  type ReportData,
  type ReportFilters,
  type ReportKind,
} from "@/lib/report-builders";
import { exportReport, type ExportFormat } from "@/lib/export-formats";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const KINDS: { value: ReportKind; label: string; hint: string }[] = [
  { value: "student", label: "Student-wise", hint: "One row per student with all five pillars." },
  { value: "batch", label: "Batch-wise", hint: "Batch averages, bands and per-batch rosters." },
  { value: "module", label: "Module-wise", hint: "Module attainment with mapped course outcomes." },
];

export function ExportCentre() {
  const fetchReportData = useServerFn(getReportData);
  const query = useQuery({ queryKey: ["report-data"], queryFn: () => fetchReportData() });

  const [kind, setKind] = useState<ReportKind>("student");
  const [batchId, setBatchId] = useState("all");
  const [moduleId, setModuleId] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState<ExportFormat | null>(null);

  const data = query.data as ReportData | undefined;
  const filters: ReportFilters = { batchId, moduleId, from, to };

  const doc = useMemo(
    () => (data ? buildReport(kind, data, filters) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, kind, batchId, moduleId, from, to],
  );

  const scopeLabel =
    batchId === "all"
      ? "all"
      : ((data?.batches.find((b) => b.id === batchId)?.name as string | undefined) ?? "batch");

  const run = async (format: ExportFormat) => {
    if (!doc) return;
    setBusy(format);
    try {
      // Yield once so the spinner paints before the (synchronous) generation.
      await new Promise((resolve) => setTimeout(resolve, 30));
      const name = exportReport(doc, format, scopeLabel);
      toast.success(`Downloaded ${name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate the report.");
    } finally {
      setBusy(null);
    }
  };

  const preview = doc?.sections[0];
  const previewColumns = preview?.columns.slice(0, 7) ?? [];
  const previewRows = preview?.rows.slice(0, 5) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Export centre</CardTitle>
        <CardDescription>
          Student-wise, batch-wise and module-wise CRT reports in PDF, Excel or CSV.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label>Report</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as ReportKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Batch</Label>
            <Select value={batchId} onValueChange={setBatchId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All batches</SelectItem>
                {(data?.batches ?? []).map((b) => (
                  <SelectItem key={String(b.id)} value={String(b.id)}>
                    {String(b.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Module</Label>
            <Select value={moduleId} onValueChange={setModuleId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modules</SelectItem>
                {(data?.modules ?? []).map((m) => (
                  <SelectItem key={String(m.id)} value={String(m.id)}>
                    {String(m.code)} · {String(m.title)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="report-from">From</Label>
            <Input
              id="report-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="report-to">To</Label>
            <Input id="report-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">{KINDS.find((k) => k.value === kind)?.hint}</p>

        {doc ? (
          <div className="flex flex-wrap gap-3 text-sm">
            {doc.summary.map((item) => (
              <div key={item.label} className="rounded-md border bg-muted/40 px-3 py-1.5">
                <span className="text-muted-foreground">{item.label}: </span>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => run("pdf")} disabled={!doc || busy !== null}>
            {busy === "pdf" ? <Loader2 className="animate-spin" /> : <FileText />}
            PDF
          </Button>
          <Button variant="secondary" onClick={() => run("xlsx")} disabled={!doc || busy !== null}>
            {busy === "xlsx" ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
            Excel
          </Button>
          <Button variant="outline" onClick={() => run("csv")} disabled={!doc || busy !== null}>
            {busy === "csv" ? <Loader2 className="animate-spin" /> : <Table2 />}
            CSV
          </Button>
          {query.isLoading ? (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading report data…
            </span>
          ) : null}
        </div>

        {preview && previewRows.length > 0 ? (
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Download className="size-3.5" />
              Preview — first {previewRows.length} of {preview.rows.length} rows
              {preview.columns.length > previewColumns.length
                ? `, ${preview.columns.length - previewColumns.length} more columns in the file`
                : null}
            </p>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {previewColumns.map((column) => (
                      <TableHead key={column} className="whitespace-nowrap text-xs">
                        {column}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, index) => (
                    <TableRow key={index}>
                      {previewColumns.map((_, cell) => (
                        <TableCell key={cell} className="whitespace-nowrap text-xs">
                          {String(row[cell] ?? "—")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}

        {doc && preview && preview.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No records match these filters yet — widen the batch, module or date range.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
