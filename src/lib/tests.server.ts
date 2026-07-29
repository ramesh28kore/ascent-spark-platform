/** Server-only helpers for the test engine. Kept out of *.functions.ts on purpose. */
import { z } from "zod";

export const generateTestSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, { message: "give the test a title of at least 3 characters" })
    .max(160, { message: "keep the title under 160 characters" }),
  batch_id: z.string().uuid().nullable(),
  module_id: z.string().uuid().nullable(),
  assessment_id: z.string().uuid().nullable().default(null),
  starts_at: z.string().min(10, { message: "pick a valid start date and time" }).max(40),
  duration_min: z
    .number()
    .int()
    .min(5, { message: "must be at least 5 minutes" })
    .max(300, { message: "must be 300 minutes or less" }),
  count: z
    .number()
    .int()
    .min(1, { message: "add at least 1 question" })
    .max(100, { message: "100 questions maximum" }),
  easy_pct: z.number().int().min(0).max(100),
  medium_pct: z.number().int().min(0).max(100),
  hard_pct: z.number().int().min(0).max(100),
  shuffle: z.boolean(),
  publish: z.boolean(),
  qtypes: z
    .array(z.enum(["mcq", "coding", "descriptive"]))
    .min(1, { message: "pick at least one question type" })
    .default(["mcq"]),
});


export const submitSchema = z.object({
  test_id: z.string().uuid(),
  responses: z.record(z.string().uuid(), z.string().max(20000)),
  blur_count: z.number().int().min(0).max(9999),
});

export type PickableQuestion = {
  id: string;
  level: string;
  bloom: string;
  marks: number;
  module_id: string | null;
};

/** Deterministic per-student ordering so two students see different papers. */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Choose questions matching a target difficulty distribution, topping up if a bucket is short. */
export function pickByDistribution(
  pool: PickableQuestion[],
  count: number,
  pcts: { easy: number; medium: number; hard: number },
): PickableQuestion[] {
  const buckets: Record<string, PickableQuestion[]> = {
    easy: seededShuffle(pool.filter((q) => q.level === "easy"), "easy"),
    medium: seededShuffle(pool.filter((q) => q.level === "medium"), "medium"),
    hard: seededShuffle(pool.filter((q) => q.level === "hard"), "hard"),
  };
  const total = Math.max(1, pcts.easy + pcts.medium + pcts.hard);
  const want = {
    easy: Math.round((count * pcts.easy) / total),
    medium: Math.round((count * pcts.medium) / total),
    hard: Math.round((count * pcts.hard) / total),
  };
  const chosen: PickableQuestion[] = [];
  (["easy", "medium", "hard"] as const).forEach((k) => {
    chosen.push(...buckets[k].slice(0, want[k]));
  });
  if (chosen.length < count) {
    const used = new Set(chosen.map((q) => q.id));
    const rest = seededShuffle(pool.filter((q) => !used.has(q.id)), "topup");
    chosen.push(...rest.slice(0, count - chosen.length));
  }
  return chosen.slice(0, count);
}

const normalise = (v: string) => v.trim().toLowerCase().replace(/\s+/g, " ");

export function scoreResponses(
  items: { question_id: string; marks: number }[],
  answers: Map<string, string | null>,
  responses: Record<string, string>,
): { score: number; maxScore: number } {
  let score = 0;
  let maxScore = 0;
  for (const item of items) {
    maxScore += item.marks;
    const key = answers.get(item.question_id);
    const given = responses[item.question_id];
    if (key && given && normalise(key) === normalise(given)) score += item.marks;
  }
  return { score, maxScore };
}
