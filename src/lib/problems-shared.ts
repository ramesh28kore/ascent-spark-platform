/** Client-safe shapes and parsers for the LeetCode-style problem workspace. */
import { templateFor } from "@/lib/code-templates";

export type ProblemExample = { input: string; output: string; explanation?: string };
export type ProblemCase = { input: string; expected_output: string; hidden: boolean };
export type ProblemLevel = "easy" | "medium" | "hard";
export type ProblemLanguage = "python" | "javascript";

export const LANGUAGES: { value: ProblemLanguage; label: string }[] = [
  { value: "python", label: "Python 3" },
  { value: "javascript", label: "JavaScript" },
];

export const LEVEL_TONE: Record<string, string> = {
  easy: "text-emerald-600 dark:text-emerald-400",
  medium: "text-amber-600 dark:text-amber-400",
  hard: "text-rose-600 dark:text-rose-400",
};

export const VERDICT_TONE: Record<string, string> = {
  accepted: "text-emerald-600 dark:text-emerald-400",
  "wrong answer": "text-rose-600 dark:text-rose-400",
  "runtime error": "text-rose-600 dark:text-rose-400",
  "time limit exceeded": "text-amber-600 dark:text-amber-400",
  pending: "text-muted-foreground",
};

const asString = (value: unknown) => (typeof value === "string" ? value : "");

function asArray(raw: unknown): unknown[] {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  return Array.isArray(value) ? value : [];
}

export function parseExamples(raw: unknown): ProblemExample[] {
  return asArray(raw)
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      input: asString(item.input),
      output: asString(item.output),
      explanation: asString(item.explanation) || undefined,
    }));
}

export function parseHints(raw: unknown): string[] {
  return asArray(raw)
    .map((item) => asString(item))
    .filter(Boolean);
}

export function parseCases(raw: unknown): ProblemCase[] {
  return asArray(raw)
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      input: asString(item.input),
      expected_output: asString(item.expected_output),
      hidden: !!item.hidden,
    }));
}

export function parseStarter(raw: unknown): Record<string, string> {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "string") out[key] = entry;
  }
  return out;
}

export function starterFor(raw: unknown, language: ProblemLanguage) {
  const map = parseStarter(raw);
  return map[language] ?? templateFor(language);
}

export const draftKey = (slug: string, language: string) => `problem-draft:${slug}:${language}`;
