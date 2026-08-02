/** Client-safe shapes for the trainer problem authoring studio. */
import { z } from "zod";

export const authoringCaseSchema = z.object({
  input: z.string().max(10000),
  expected_output: z.string().max(10000),
  hidden: z.boolean(),
});

export const authoringSchema = z.object({
  id: z.string().uuid().nullable(),
  title: z.string().trim().min(3, { message: "give the problem a title" }).max(160),
  slug: z
    .string()
    .trim()
    .min(3, { message: "the slug needs at least 3 characters" })
    .max(120)
    .regex(/^[a-z0-9-]+$/, { message: "use lowercase letters, numbers and dashes only" }),
  level: z.enum(["easy", "medium", "hard"]),
  category: z.string().trim().min(1, { message: "pick a topic category" }).max(60),
  company: z.string().trim().max(80).nullable(),
  company_frequency: z.number().int().min(0).max(100),
  module_id: z.string().uuid().nullable(),
  points: z.number().int().min(1).max(100),
  tags: z.array(z.string().trim().min(1).max(40)).max(12),
  statement: z.string().trim().min(10, { message: "write the problem statement" }).max(20000),
  constraints: z.string().trim().max(4000).nullable(),
  examples: z
    .array(
      z.object({
        input: z.string().max(4000),
        output: z.string().max(4000),
        explanation: z.string().max(2000).optional(),
      }),
    )
    .max(6),
  hints: z.array(z.string().trim().min(1).max(500)).max(6),
  test_cases: z
    .array(authoringCaseSchema)
    .min(1, { message: "add at least one test case" })
    .max(60),
  starter_code: z.object({ python: z.string().max(8000), javascript: z.string().max(8000) }),
  solution: z.string().trim().max(20000).nullable(),
  editorial: z.string().trim().max(20000).nullable(),
  reference_language: z.enum(["python", "javascript"]),
  time_limit_ms: z.number().int().min(500).max(15000),
  memory_limit_kb: z.number().int().min(16000).max(512000),
  visible_to_all_batches: z.boolean(),
  batch_ids: z.array(z.string().uuid()).max(50),
});

export type AuthoringDraft = z.infer<typeof authoringSchema>;

export const emptyDraft = (): AuthoringDraft => ({
  id: null,
  title: "",
  slug: "",
  level: "easy",
  category: "Arrays",
  company: null,
  company_frequency: 0,
  module_id: null,
  points: 10,
  tags: [],
  statement: "",
  constraints: null,
  examples: [],
  hints: [],
  test_cases: [{ input: "", expected_output: "", hidden: false }],
  starter_code: { python: "", javascript: "" },
  solution: null,
  editorial: null,
  reference_language: "python",
  time_limit_ms: 5000,
  memory_limit_kb: 128000,
  visible_to_all_batches: true,
  batch_ids: [],
});

export function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

/**
 * A draft may only be published once every test case has been proven against
 * the trainer's own reference solution.
 */
export function publishBlockers(draft: {
  test_cases: unknown[];
  statement: string;
  solution: string | null;
  visible_to_all_batches: boolean;
  batch_ids: string[];
}): string[] {
  const blockers: string[] = [];
  if (draft.test_cases.length === 0) blockers.push("Add at least one test case.");
  if (draft.statement.trim().length < 10) blockers.push("Write the problem statement.");
  if (!draft.solution || draft.solution.trim().length < 5)
    blockers.push("Add a reference solution so the test cases can be validated.");
  if (!draft.visible_to_all_batches && draft.batch_ids.length === 0)
    blockers.push("Pick at least one batch, or make the problem visible to all batches.");
  return blockers;
}
