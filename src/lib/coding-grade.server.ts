/** Server-only helpers for grading coding submissions. */
import { z } from "zod";

export const testCaseSchema = z.object({
  input: z.string().max(4000).default(""),
  expected_output: z.string().max(4000).default(""),
  hidden: z.boolean().default(false),
});
export type TestCase = z.infer<typeof testCaseSchema>;

export const codingSubmitSchema = z.object({
  test_id: z.string().uuid(),
  question_id: z.string().uuid(),
  code: z.string().trim().min(1, { message: "write some code before submitting" }).max(20000),
  language: z.enum(["javascript", "python"]),
  cases_passed: z.number().int().min(0).max(200).default(0),
  cases_total: z.number().int().min(0).max(200).default(0),
});

export function parseTestCases(raw: unknown): TestCase[] {
  const parsed = z.array(testCaseSchema).safeParse(raw ?? []);
  return parsed.success ? parsed.data : [];
}

export function buildGradingPrompt(args: {
  prompt: string;
  marks: number;
  language: string;
  code: string;
  cases: TestCase[];
  clientPassed: number;
  clientTotal: number;
}) {
  const cases = args.cases
    .map(
      (c, i) =>
        `Case ${i + 1}${c.hidden ? " (hidden)" : ""}\nInput:\n${c.input || "(none)"}\nExpected output:\n${c.expected_output || "(none)"}`,
    )
    .join("\n\n");

  return [
    "You are grading one coding answer in a campus placement training test.",
    `Question (worth ${args.marks} marks):\n${args.prompt}`,
    cases ? `Test cases:\n${cases}` : "No test cases were provided; judge correctness from the question.",
    `Student's ${args.language} solution:\n\`\`\`\n${args.code}\n\`\`\``,
    `The student's browser reported ${args.clientPassed}/${args.clientTotal} test cases passing. Treat that as an UNVERIFIED claim: reason about the code yourself and ignore the claim if the code does not support it.`,
    `Award a score between 0 and ${args.marks} (partial credit allowed for a mostly correct approach). Give a one-word verdict (accepted, partial, wrong, or empty) and at most two sentences of feedback for the student. Do not reveal hidden expected outputs.`,
  ].join("\n\n");
}

export const gradeOutputSchema = z.object({
  score: z.number(),
  verdict: z.string(),
  feedback: z.string(),
});

export function clampScore(score: number, marks: number) {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(marks, Math.round(score * 100) / 100));
}
