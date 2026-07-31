import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BadgeCheck, ShieldX } from "lucide-react";
import { z } from "zod";

import { verifyCertificate } from "@/lib/exams.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/verify")({
  validateSearch: z.object({ code: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Verify a CRT certificate" },
      {
        name: "description",
        content:
          "Check the authenticity of a campus recruitment training certificate using its unique certificate code.",
      },
      { property: "og:title", content: "Verify a CRT certificate" },
      {
        property: "og:description",
        content: "Public verification for CRT training certificates.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const { code: initialCode } = Route.useSearch();
  const [code, setCode] = useState(initialCode ?? "");

  const check = useMutation({
    mutationFn: (value: string) => verifyCertificate({ data: { code: value } }),
  });

  useEffect(() => {
    if (initialCode) check.mutate(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  const result = check.data;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-4 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Certificate verification</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the code printed on the certificate, or scan its QR code.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Check a certificate</CardTitle>
          <CardDescription>Codes look like CRT-2026-A1B2C3D4.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              if (code.trim().length >= 4) check.mutate(code.trim());
            }}
          >
            <div className="flex-1 space-y-2">
              <Label htmlFor="code">Certificate code</Label>
              <Input
                id="code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="CRT-2026-A1B2C3D4"
                className="font-mono"
              />
            </div>
            <Button type="submit" disabled={check.isPending}>
              {check.isPending ? "Checking…" : "Verify"}
            </Button>
          </form>

          {result?.valid ? (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <p className="flex items-center gap-2 font-medium text-primary">
                <BadgeCheck className="size-5" /> Valid certificate
              </p>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Holder</dt>
                  <dd className="font-medium">{result.certificate.holder_name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Award</dt>
                  <dd className="font-medium">{result.certificate.title}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Score</dt>
                  <dd className="font-medium">
                    {result.certificate.score} / {result.certificate.max_score}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Issued on</dt>
                  <dd className="font-medium">
                    {new Date(result.certificate.issued_on).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}

          {result && !result.valid ? (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              <ShieldX className="size-5" /> No certificate matches that code.
            </div>
          ) : null}

          {check.isError ? (
            <p className="text-sm text-destructive">
              Verification is temporarily unavailable. Please try again shortly.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        <Link to="/" className="underline underline-offset-4">
          Back to the training console
        </Link>
      </p>
    </main>
  );
}
