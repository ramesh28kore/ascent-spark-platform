import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Award, Download } from "lucide-react";

import { issueCertificate, listCertificates } from "@/lib/exams.functions";
import { meQuery, modulesQuery, studentsQuery } from "@/lib/crt-queries";
import { downloadCertificatePdf } from "@/lib/certificate-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/certificates")({
  head: () => ({
    meta: [
      { title: "Certificates — CRT Training Console" },
      {
        name: "description",
        content:
          "Issue and download QR-verifiable CRT completion certificates for students and modules.",
      },
      { property: "og:title", content: "Certificates — CRT Training Console" },
      {
        property: "og:description",
        content: "QR-verifiable CRT training certificates.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CertificatesPage,
});

function CertificatesPage() {
  const queryClient = useQueryClient();
  const me = useQuery(meQuery);
  const students = useQuery(studentsQuery);
  const modules = useQuery(modulesQuery);

  const listFn = useServerFn(listCertificates);
  const issueFn = useServerFn(issueCertificate);
  const certificates = useQuery({ queryKey: ["certificates"], queryFn: () => listFn() });

  const [studentId, setStudentId] = useState("");
  const [title, setTitle] = useState("CRT Training Completion");
  const [kind, setKind] = useState("completion");
  const [moduleId, setModuleId] = useState("none");
  const [score, setScore] = useState("80");
  const [maxScore, setMaxScore] = useState("100");

  const issue = useMutation({
    mutationFn: () =>
      issueFn({
        data: {
          student_id: studentId,
          title,
          kind,
          module_id: moduleId === "none" ? null : moduleId,
          score: Number(score || 0),
          max_score: Number(maxScore || 100),
        },
      }),
    onSuccess: () => {
      toast.success("Certificate issued");
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const isStaff = me.data?.isStaff ?? false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Certificates</h1>
        <p className="text-sm text-muted-foreground">
          Every certificate carries a unique code and QR that anyone can verify publicly.
        </p>
      </div>

      {isStaff ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Issue a certificate</CardTitle>
            <CardDescription>Awarded certificates appear instantly for the student.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {(students.data ?? []).map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cert-title">Title</Label>
              <Input
                id="cert-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completion">Course completion</SelectItem>
                  <SelectItem value="module">Module mastery</SelectItem>
                  <SelectItem value="merit">Merit / topper</SelectItem>
                  <SelectItem value="participation">Participation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Module (optional)</Label>
              <Select value={moduleId} onValueChange={setModuleId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not module specific</SelectItem>
                  {(modules.data?.modules ?? []).map((module) => (
                    <SelectItem key={module.id} value={module.id}>
                      {module.code} · {module.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cert-score">Score</Label>
              <Input
                id="cert-score"
                type="number"
                value={score}
                onChange={(event) => setScore(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cert-max">Out of</Label>
              <Input
                id="cert-max"
                type="number"
                value={maxScore}
                onChange={(event) => setMaxScore(event.target.value)}
              />
            </div>
            <div className="md:col-span-3">
              <Button onClick={() => issue.mutate()} disabled={!studentId || issue.isPending}>
                <Award className="mr-2 size-4" />
                Issue certificate
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {(certificates.data ?? []).length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No certificates yet.
            </CardContent>
          </Card>
        ) : null}

        {(certificates.data ?? []).map((certificate) => (
          <Card key={certificate.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{certificate.title}</CardTitle>
                  <CardDescription>
                    {certificate.holder_name} · issued{" "}
                    {new Date(certificate.issued_on).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Badge variant="outline">{certificate.kind}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <div className="text-sm">
                <p className="font-mono text-xs text-muted-foreground">{certificate.code}</p>
                <p className="mt-1 font-medium">
                  {certificate.score} / {certificate.max_score}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() =>
                  downloadCertificatePdf({
                    code: certificate.code,
                    holder_name: certificate.holder_name,
                    title: certificate.title,
                    kind: certificate.kind,
                    score: certificate.score,
                    max_score: certificate.max_score,
                    issued_on: certificate.issued_on,
                  })
                }
              >
                <Download className="mr-2 size-4" />
                PDF
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
