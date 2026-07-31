import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Download, KeyRound, Loader2, Trash2, UserPlus, Wand2 } from "lucide-react";
import * as XLSX from "xlsx";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { meQuery, batchesQuery } from "@/lib/crt-queries";
import {
  createStaffAccount,
  deleteAccount,
  generateStudentCredentials,
  getCredentialSettings,
  listStaffAccounts,
  listStudentCredentials,
  previewStudentCredentials,
  resetAccountPassword,
  saveCredentialSettings,
} from "@/lib/admin.functions";
import {
  csvEscape,
  expandRange,
  isValidDomain,
  normaliseRoll,
  parseRollList,
  rollToEmail,
} from "@/lib/admin-shared";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin console — CRT Training Console" },
      {
        name: "description",
        content:
          "Super admin console to create trainer logins and generate student usernames and passwords in bulk by batch, section or year.",
      },
      { property: "og:title", content: "Admin console — CRT Training Console" },
      {
        property: "og:description",
        content: "Create trainer accounts and generate student credentials in bulk.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminConsole,
});

const NONE = "__none__";

function downloadBlob(name: string, content: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

type CredentialRow = {
  roll: string;
  email: string;
  password: string;
  batch?: string;
  section?: string;
  year?: string;
};

function exportCredentials(rows: CredentialRow[], label: string) {
  if (!rows.length) return toast.error("Nothing to export yet");
  const header = ["Roll number", "Username", "Password", "Batch", "Section", "Year"];
  const body = rows.map((r) => [r.roll, r.email, r.password, r.batch ?? "", r.section ?? "", r.year ?? ""]);

  const csv = [header, ...body].map((line) => line.map((c) => csvEscape(String(c))).join(",")).join("\n");
  downloadBlob(`${label}.csv`, csv, "text/csv;charset=utf-8");

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
  ws["!cols"] = [{ wch: 16 }, { wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws, "Credentials");
  XLSX.writeFile(wb, `${label}.xlsx`);
  toast.success("Credential sheet downloaded");
}

function AdminConsole() {
  const { data: me } = useQuery(meQuery);

  if (me && !me.isAdmin) {
    return (
      <AppShell>
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="font-display">Admin only</CardTitle>
            <CardDescription>
              This console is restricted to the super admin account.
            </CardDescription>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Admin console</h1>
          <p className="text-sm text-muted-foreground">
            Create trainer logins and generate student usernames and passwords batch, section or
            year wise.
          </p>
        </header>

        <Tabs defaultValue="generate">
          <TabsList>
            <TabsTrigger value="generate">Generate students</TabsTrigger>
            <TabsTrigger value="staff">Trainers</TabsTrigger>
            <TabsTrigger value="directory">Existing credentials</TabsTrigger>
            <TabsTrigger value="settings">Email domains</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="mt-4">
            <GenerateStudents />
          </TabsContent>
          <TabsContent value="staff" className="mt-4">
            <StaffAccounts />
          </TabsContent>
          <TabsContent value="directory" className="mt-4">
            <Directory />
          </TabsContent>
          <TabsContent value="settings" className="mt-4">
            <DomainSettings />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */

function useDomains() {
  const fetchSettings = useServerFn(getCredentialSettings);
  return useQuery({
    queryKey: ["credential-settings"],
    queryFn: () => fetchSettings(),
  });
}

function GenerateStudents() {
  const { data: settings } = useDomains();
  const { data: batches } = useQuery(batchesQuery);
  const preview = useServerFn(previewStudentCredentials);
  const generate = useServerFn(generateStudentCredentials);

  const [mode, setMode] = useState<"range" | "list">("range");
  const [prefix, setPrefix] = useState("23Q61A05");
  const [start, setStart] = useState("1");
  const [end, setEnd] = useState("60");
  const [pad, setPad] = useState("2");
  const [pasted, setPasted] = useState("");
  const [domain, setDomain] = useState("");
  const [batchId, setBatchId] = useState(NONE);
  const [section, setSection] = useState("A");
  const [year, setYear] = useState("III");
  const [branch, setBranch] = useState("CSE");
  const [rows, setRows] = useState<
    { roll: string; email: string; password: string; exists: boolean }[]
  >([]);
  const [result, setResult] = useState<{
    created: { roll: string; email: string; password: string }[];
    skipped: { roll: string; reason: string }[];
  } | null>(null);

  const activeDomain = domain || settings?.defaultDomain || "gmail.com";
  const batchName =
    batchId === NONE ? "" : (batches ?? []).find((b: { id: string }) => b.id === batchId)?.name ?? "";

  const rolls = useMemo(() => {
    if (mode === "list") return parseRollList(pasted);
    const s = Number(start);
    const e = Number(end);
    if (!prefix.trim() || !Number.isFinite(s) || !Number.isFinite(e)) return [];
    if (Math.abs(e - s) + 1 > 300) return [];
    return expandRange(prefix, s, e, Number(pad) || 2);
  }, [mode, pasted, prefix, start, end, pad]);

  const payload = () => ({
    rolls,
    domain: activeDomain,
    batchId: batchId === NONE ? null : batchId,
    batchName,
    section,
    year,
    branch,
  });

  const previewMutation = useMutation({
    mutationFn: () => preview({ data: payload() }),
    onSuccess: (data) => {
      setRows(data.rows);
      setResult(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const generateMutation = useMutation({
    mutationFn: () => generate({ data: payload() }),
    onSuccess: (data) => {
      setResult(data);
      toast.success(`${data.created.length} account(s) created`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rangeTooBig = mode === "range" && rolls.length === 0 && prefix.trim().length > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Roll numbers</CardTitle>
          <CardDescription>
            Username is the roll number plus the chosen domain; the password is the roll number
            itself — e.g. {rolls[0] ? rollToEmail(rolls[0], activeDomain) : `23Q61A0501@${activeDomain}`}{" "}
            / {rolls[0] ?? "23Q61A0501"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "range" | "list")}>
            <TabsList>
              <TabsTrigger value="range">Range</TabsTrigger>
              <TabsTrigger value="list">Paste list</TabsTrigger>
            </TabsList>

            <TabsContent value="range" className="mt-3 grid gap-3 sm:grid-cols-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="prefix">Roll prefix</Label>
                <Input id="prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} maxLength={30} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="start">From</Label>
                <Input id="start" value={start} onChange={(e) => setStart(e.target.value)} inputMode="numeric" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end">To</Label>
                <Input id="end" value={end} onChange={(e) => setEnd(e.target.value)} inputMode="numeric" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pad">Digits</Label>
                <Input id="pad" value={pad} onChange={(e) => setPad(e.target.value)} inputMode="numeric" />
              </div>
            </TabsContent>

            <TabsContent value="list" className="mt-3">
              <Label htmlFor="pasted">Roll numbers</Label>
              <Textarea
                id="pasted"
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                rows={6}
                placeholder={"23Q61A0501\n23Q61A0502, 23Q61A0503"}
              />
            </TabsContent>
          </Tabs>

          <div className="grid gap-3 sm:grid-cols-5">
            <div className="space-y-1.5">
              <Label>Domain</Label>
              <Select value={activeDomain} onValueChange={setDomain}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(settings?.domains ?? ["gmail.com"]).map((d: string) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Batch</Label>
              <Select value={batchId} onValueChange={setBatchId}>
                <SelectTrigger>
                  <SelectValue placeholder="No batch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No batch</SelectItem>
                  {(batches ?? []).map((b: { id: string; name: string }) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="section">Section</Label>
              <Input id="section" value={section} onChange={(e) => setSection(e.target.value)} maxLength={20} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="year">Year</Label>
              <Input id="year" value={year} onChange={(e) => setYear(e.target.value)} maxLength={20} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="branch">Branch</Label>
              <Input id="branch" value={branch} onChange={(e) => setBranch(e.target.value)} maxLength={60} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              disabled={!rolls.length || previewMutation.isPending}
              onClick={() => previewMutation.mutate()}
            >
              {previewMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              Preview {rolls.length ? `(${rolls.length})` : ""}
            </Button>
            <Button
              disabled={!rows.length || generateMutation.isPending}
              onClick={() => generateMutation.mutate()}
            >
              {generateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate accounts
            </Button>
            {rangeTooBig && (
              <span className="text-sm text-destructive">
                Keep the range to 300 roll numbers or fewer.
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {rows.length > 0 && !result && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">
              Preview · {rows.length} roll numbers
            </CardTitle>
            <CardDescription>
              {rows.filter((r) => r.exists).length} already have an account and will be skipped.
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.roll}>
                    <TableCell className="font-mono text-xs">{r.roll}</TableCell>
                    <TableCell className="font-mono text-xs">{r.email}</TableCell>
                    <TableCell className="font-mono text-xs">{r.password}</TableCell>
                    <TableCell>
                      {r.exists ? (
                        <Badge variant="secondary">Exists</Badge>
                      ) : (
                        <Badge>New</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="font-display text-lg">
                Created {result.created.length} · skipped {result.skipped.length}
              </CardTitle>
              <CardDescription>
                Download the sheet now — passwords are shown once here.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() =>
                exportCredentials(
                  result.created.map((c) => ({ ...c, batch: batchName, section, year })),
                  `student-credentials-${section || "all"}-${new Date().toISOString().slice(0, 10)}`,
                )
              }
            >
              <Download className="mr-2 h-4 w-4" />
              Download credentials
            </Button>
          </CardHeader>
          <CardContent className="max-h-96 space-y-4 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Password</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.created.map((c) => (
                  <TableRow key={c.roll}>
                    <TableCell className="font-mono text-xs">{c.roll}</TableCell>
                    <TableCell className="font-mono text-xs">{c.email}</TableCell>
                    <TableCell className="font-mono text-xs">{c.password}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {result.skipped.length > 0 && (
              <div className="rounded-md border p-3 text-sm">
                <p className="mb-2 font-medium">Skipped</p>
                <ul className="space-y-1 text-muted-foreground">
                  {result.skipped.map((s) => (
                    <li key={s.roll}>
                      <span className="font-mono text-xs">{s.roll}</span> — {s.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function randomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$";
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function StaffAccounts() {
  const queryClient = useQueryClient();
  const list = useServerFn(listStaffAccounts);
  const create = useServerFn(createStaffAccount);
  const reset = useServerFn(resetAccountPassword);
  const remove = useServerFn(deleteAccount);

  const staffQuery = useQuery({ queryKey: ["staff-accounts"], queryFn: () => list() });

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(randomPassword());
  const [branch, setBranch] = useState("");
  const [role, setRole] = useState<"trainer" | "placement" | "admin">("trainer");
  const [issued, setIssued] = useState<{ email: string; password: string } | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["staff-accounts"] });

  const createMutation = useMutation({
    mutationFn: () => create({ data: { fullName, email, password, branch, role } }),
    onSuccess: (data) => {
      setIssued({ email: data.email, password: data.password });
      setFullName("");
      setEmail("");
      setBranch("");
      setPassword(randomPassword());
      invalidate();
      toast.success("Account created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetMutation = useMutation({
    mutationFn: (vars: { userId: string; password: string }) => reset({ data: vars }),
    onSuccess: () => toast.success("Password updated"),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => remove({ data: { userId } }),
    onSuccess: () => {
      invalidate();
      toast.success("Account removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Create a staff login</CardTitle>
          <CardDescription>The account is active immediately — no email confirmation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tname">Full name</Label>
              <Input id="tname" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="temail">Username (email)</Label>
              <Input id="temail" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={160} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpass">Password</Label>
              <div className="flex gap-2">
                <Input id="tpass" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={72} />
                <Button type="button" variant="outline" onClick={() => setPassword(randomPassword())}>
                  <KeyRound className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tbranch">Branch</Label>
              <Input id="tbranch" value={branch} onChange={(e) => setBranch(e.target.value)} maxLength={60} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trainer">Trainer</SelectItem>
                  <SelectItem value="placement">Placement cell</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
            {createMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            Create account
          </Button>

          {issued && (
            <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/40 p-3 text-sm">
              <span className="font-mono">{issued.email}</span>
              <span className="font-mono">{issued.password}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(`${issued.email} / ${issued.password}`);
                  toast.success("Copied");
                }}
              >
                <Copy className="mr-2 h-3.5 w-3.5" />
                Copy
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  exportCredentials(
                    [{ roll: "", email: issued.email, password: issued.password }],
                    "staff-credential",
                  )
                }
              >
                <Download className="mr-2 h-3.5 w-3.5" />
                Sheet
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Staff accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(staffQuery.data?.staff ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.full_name}</TableCell>
                  <TableCell className="font-mono text-xs">{s.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{s.role}</Badge>
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const next = randomPassword();
                        if (!s.user_id) return;
                        resetMutation.mutate(
                          { userId: s.user_id, password: next },
                          {
                            onSuccess: () => {
                              navigator.clipboard.writeText(next);
                              toast.success(`New password copied: ${next}`);
                            },
                          },
                        );
                      }}
                    >
                      <KeyRound className="mr-2 h-3.5 w-3.5" />
                      Reset
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => s.user_id && deleteMutation.mutate(s.user_id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Directory() {
  const list = useServerFn(listStudentCredentials);
  const reset = useServerFn(resetAccountPassword);
  const { data: batches } = useQuery(batchesQuery);

  const [search, setSearch] = useState("");
  const [batchId, setBatchId] = useState(NONE);
  const [section, setSection] = useState("");
  const [year, setYear] = useState("");

  const filters = {
    search,
    batchId: batchId === NONE ? null : batchId,
    section,
    year,
  };

  const studentsQuery = useQuery({
    queryKey: ["student-credentials", filters],
    queryFn: () => list({ data: filters }),
  });

  const resetMutation = useMutation({
    mutationFn: (vars: { userId: string; password: string }) => reset({ data: vars }),
    onSuccess: () => toast.success("Password reset to the roll number"),
    onError: (e: Error) => toast.error(e.message),
  });

  const students = studentsQuery.data?.students ?? [];

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="font-display text-lg">Student credentials</CardTitle>
          <CardDescription>
            Passwords are not stored in readable form — reset restores the roll number.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            exportCredentials(
              students.map((s) => ({
                roll: s.roll_number ?? "",
                email: s.email ?? "",
                password: s.roll_number ?? "",
                batch: s.batch ?? "",
                section: s.section ?? "",
                year: s.year ?? "",
              })),
              "student-usernames",
            )
          }
        >
          <Download className="mr-2 h-4 w-4" />
          Export list
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Input placeholder="Search roll or email" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={batchId} onValueChange={setBatchId}>
            <SelectTrigger>
              <SelectValue placeholder="All batches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>All batches</SelectItem>
              {(batches ?? []).map((b: { id: string; name: string }) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Section" value={section} onChange={(e) => setSection(e.target.value)} />
          <Input placeholder="Year" value={year} onChange={(e) => setYear(e.target.value)} />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Roll</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Year</TableHead>
              <TableHead className="text-right">Password</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-xs">{s.roll_number}</TableCell>
                <TableCell className="font-mono text-xs">{s.email}</TableCell>
                <TableCell>{s.batch ?? "—"}</TableCell>
                <TableCell>{s.section ?? "—"}</TableCell>
                <TableCell>{s.year ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!s.user_id || !s.roll_number}
                    onClick={() =>
                      s.user_id &&
                      s.roll_number &&
                      resetMutation.mutate({
                        userId: s.user_id,
                        password: normaliseRoll(s.roll_number),
                      })
                    }
                  >
                    <KeyRound className="mr-2 h-3.5 w-3.5" />
                    Reset to roll
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

function DomainSettings() {
  const queryClient = useQueryClient();
  const { data } = useDomains();
  const save = useServerFn(saveCredentialSettings);
  const [newDomain, setNewDomain] = useState("");

  const mutation = useMutation({
    mutationFn: (vars: { domains: string[]; defaultDomain: string }) => save({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credential-settings"] });
      setNewDomain("");
      toast.success("Domains updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const domains = data?.domains ?? [];

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="font-display text-lg">Email domains</CardTitle>
        <CardDescription>
          Student usernames are built as roll number + domain. Add your college domain here and pick
          it while generating.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="college.ac.in"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            maxLength={80}
          />
          <Button
            onClick={() => {
              const d = newDomain.trim().replace(/^@/, "").toLowerCase();
              if (!isValidDomain(d)) return toast.error("Enter a valid domain like college.ac.in");
              mutation.mutate({
                domains: [...domains, d],
                defaultDomain: data?.defaultDomain ?? d,
              });
            }}
          >
            Add domain
          </Button>
        </div>

        <div className="space-y-2">
          {domains.map((d: string) => (
            <div key={d} className="flex items-center justify-between rounded-md border p-2 text-sm">
              <span className="font-mono">{d}</span>
              <div className="flex items-center gap-2">
                {data?.defaultDomain === d ? (
                  <Badge>Default</Badge>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => mutation.mutate({ domains, defaultDomain: d })}
                    >
                      Make default
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        mutation.mutate({
                          domains: domains.filter((x: string) => x !== d),
                          defaultDomain: data?.defaultDomain ?? "gmail.com",
                        })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
