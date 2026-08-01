import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, Target, Code2, BarChart3, ClipboardList, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CRT Training Console — Campus Recruitment Readiness" },
      {
        name: "description",
        content:
          "Plan the M1–M7 CRT syllabus, track student scores, generate mock NQT papers and run a Python coding library from one dashboard.",
      },
      { property: "og:title", content: "CRT Training Console — Campus Recruitment Readiness" },
      {
        property: "og:description",
        content:
          "Modules, performance tracking, question bank and coding practice for technical placement training.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const pillars = [
  { title: "Aptitude & Reasoning", weight: "30–40%", note: "Quant, DI, logical, verbal" },
  { title: "Programming Logic & DSA", weight: "30–40%", note: "MCQ + 2 coding problems" },
  { title: "CS Core", weight: "15–20%", note: "DBMS, OS, CN, OOPs" },
  { title: "Interview & HR", weight: "10–15%", note: "Resume, project defence" },
];

const features = [
  {
    icon: ClipboardList,
    title: "Module planner",
    body: "M1–M7 with hours, topics and deliverables tracked to completion.",
  },
  {
    icon: BarChart3,
    title: "Performance tracking",
    body: "Student × module × score × attempts, with bottom-quartile flags.",
  },
  {
    icon: Users,
    title: "Batch view",
    body: "Filter by batch, branch and year; drill into any student.",
  },
  {
    icon: Code2,
    title: "Coding library",
    body: "Problem → Approach → Python → Output → Complexity → Follow-ups.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-display text-base font-semibold tracking-tight">
              CRT Training Console
            </span>
          </div>
          <Button asChild size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          <Target className="h-3.5 w-3.5" /> Technical CRT · CSE / IT / ECE
        </p>
        <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl">
          Run the entire campus recruitment training programme from one console
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground">
          A 60–75 hour module plan, a graded problem ladder, a Bloom-tagged question bank and weekly
          score tracking — for trainers and students, in one place.
        </p>
        <div className="mt-8 flex gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Open the dashboard</Link>
          </Button>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p) => (
            <Card key={p.title} className="border-l-4 border-l-accent">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-sm">{p.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-display text-2xl font-bold text-foreground">{p.weight}</p>
                <p className="mt-1 text-xs text-muted-foreground">{p.note}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t bg-card">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="font-display text-2xl font-bold tracking-tight">What's inside</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        CRT Training Console · Module plan M1–M7
      </footer>
    </div>
  );
}
