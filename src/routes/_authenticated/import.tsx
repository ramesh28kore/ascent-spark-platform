import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { meQuery } from "@/lib/crt-queries";
import { bulkImport } from "@/lib/import.functions";
import { DATASETS, datasetSpec, type DatasetKey } from "@/lib/import-schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/import")({
  component: ImportPage,
  head: () => ({
    meta: [
      { title: "Bulk import - CRT Training Console" },
      {
        name: "description",
        content:
          "Upload students, modules, assessments, questions and scores into the CRT training dashboard from a CSV or Excel spreadsheet.",
      },
      { property: "og:title", content: "Bulk import - CRT Training Console" },
      {
        property: "og:description",
        content: "Load your batch roster and syllabus setup data from a spreadsheet in one step.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type ParsedSheet = { name: string; rows: Record<string, string>[]; headers: string[] };

function normalizeHeader(h: string) {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

function ImportPage() {
  const { data: me } = useQuery(meQuery);
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dataset, setDataset] = useState<DatasetKey>("students");
  const [fileName, setFileName] = useState("");
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [sheetName, setSheetName] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof bulkImport>> | null>(null);

  const spec = datasetSpec(dataset);
  const sheet = sheets.find((s) => s.name === sheetName) ?? sheets[0];

  const mapped = useMemo(() => {
    if (!sheet) return [];
    const allowed = new Set(spec.fields.map((f) => f.key));
    return sheet.rows
      .map((row) => {
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) {
          if (allowed.has(k)) out[k] = v;
        }
        return out;
      })
      .filter((r) => Object.values(r).some((v) => v !== ""));
  }, [sheet, spec]);

  const missingRequired = spec.fields
    .filter((f) => f.required)
    .map((f) => f.key)
    .filter((key) => !sheet?.headers.includes(key));

  const unmatched = (sheet?.headers ?? []).filter(
    (h) => !spec.fields.some((f) => f.key === h),
  );

  async function handleFile(file: File) {
    setResult(null);
    setFileName(file.name);
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const parsed: ParsedSheet[] = wb.SheetNames.map((name) => {
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[name], {
        defval: "",
        raw: false,
      });
      const rows = raw.map((r) => {
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(r)) {
          out[normalizeHeader(k)] = v == null ? "" : String(v).trim();
        }
        return out;
      });
      return { name, rows, headers: Object.keys(rows[0] ?? {}) };
    }).filter((s) => s.rows.length > 0);

    if (parsed.length === 0) {
      toast.error("No rows found in that file.");
      setSheets([]);
      return;
    }
    setSheets(parsed);
    const guess =
      parsed.find((s) => normalizeHeader(s.name).includes(dataset)) ??
      parsed.find((s) => DATASETS.some((d) => normalizeHeader(s.name).includes(d.key))) ??
      parsed[0];
    setSheetName(guess.name);
    const guessed = DATASETS.find((d) => normalizeHeader(guess.name).includes(d.key));
    if (guessed) setDataset(guessed.key);
  }

  const runImport = useMutation({
    mutationFn: () => bulkImport({ data: { dataset, rows: mapped.slice(0, 500) } }),
    onSuccess: async (res) => {
      setResult(res);
      toast.success(`${res.inserted} added, ${res.updated} updated, ${res.skipped} skipped`);
      await queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function downloadTemplate() {
    const ws = XLSX.utils.json_to_sheet([spec.sample], {
      header: spec.fields.map((f) => f.key),
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, spec.key);
    XLSX.writeFile(wb, `crt-${spec.key}-template.xlsx`);
  }

  if (me && !me.isTrainer) {
    return (
      <AppShell>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Trainers only</AlertTitle>
          <AlertDescription>Bulk import is restricted to trainer accounts.</AlertDescription>
        </Alert>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Bulk import</h1>
            <p className="text-sm text-muted-foreground">
              Upload a CSV or Excel file to load the roster and initial setup data in one pass.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" /> {spec.label} template
            </Button>
            <Button onClick={() => fileRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" /> Choose file
            </Button>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">1. Pick the data type</CardTitle>
              <CardDescription>{spec.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={dataset} onValueChange={(v) => setDataset(v as DatasetKey)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATASETS.map((d) => (
                    <SelectItem key={d.key} value={d.key}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Expected columns
                </p>
                <ul className="space-y-1 text-sm">
                  {spec.fields.map((f) => (
                    <li key={f.key} className="flex items-baseline justify-between gap-2">
                      <code className="text-xs">{f.key}</code>
                      <span className="text-xs text-muted-foreground">
                        {f.required ? "required" : (f.hint ?? "optional")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-muted-foreground">
                Import order matters: modules → topics → assessments → students → scores.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">2. Review and import</CardTitle>
              <CardDescription>
                {fileName ? (
                  <span className="inline-flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" /> {fileName}
                  </span>
                ) : (
                  "No file selected yet — CSV, XLSX and XLS are supported."
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sheets.length > 1 && (
                <Select value={sheet?.name} onValueChange={setSheetName}>
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sheets.map((s) => (
                      <SelectItem key={s.name} value={s.name}>
                        {s.name} ({s.rows.length} rows)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {sheet && missingRequired.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Missing required columns</AlertTitle>
                  <AlertDescription>{missingRequired.join(", ")}</AlertDescription>
                </Alert>
              )}

              {sheet && unmatched.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Ignored columns: {unmatched.join(", ")}
                </p>
              )}

              {sheet && (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{mapped.length} rows ready</Badge>
                    {mapped.length > 500 && (
                      <Badge variant="destructive">only first 500 will import</Badge>
                    )}
                  </div>
                  <div className="max-h-[360px] overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {spec.fields.map((f) => (
                            <TableHead key={f.key} className="whitespace-nowrap">
                              {f.key}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mapped.slice(0, 20).map((row, i) => (
                          <TableRow key={i}>
                            {spec.fields.map((f) => (
                              <TableCell key={f.key} className="max-w-[220px] truncate text-xs">
                                {row[f.key] ?? ""}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Button
                    onClick={() => runImport.mutate()}
                    disabled={
                      runImport.isPending || mapped.length === 0 || missingRequired.length > 0
                    }
                  >
                    {runImport.isPending
                      ? "Importing…"
                      : `Import ${Math.min(mapped.length, 500)} ${spec.label.toLowerCase()}`}
                  </Button>
                </>
              )}

              {result && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>
                    {result.inserted} added · {result.updated} updated · {result.skipped} skipped
                  </AlertTitle>
                  <AlertDescription>
                    {result.errors.length === 0 ? (
                      "All rows processed cleanly."
                    ) : (
                      <ul className="mt-2 space-y-1 text-xs">
                        {result.errors.map((e, i) => (
                          <li key={i}>
                            Row {e.row}: {e.message}
                          </li>
                        ))}
                      </ul>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
