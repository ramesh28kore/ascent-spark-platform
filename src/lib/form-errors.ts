/** Turns raw validation failures (Zod issue arrays) into readable, user-facing text. */

type ZodIssueLike = { message?: unknown; path?: unknown };

const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  duration_min: "Duration (minutes)",
  count: "Number of questions",
  starts_at: "Start date & time",
  scheduled_at: "Date & time",
  trainer_name: "Trainer",
  notes: "Notes",
  easy_pct: "Easy %",
  medium_pct: "Medium %",
  hard_pct: "Hard %",
  batch_id: "Batch",
  module_id: "Module",
  full_name: "Full name",
  email: "Email",
  roll_number: "Roll number",
  marks: "Marks",
  rating: "Rating",
};

export function fieldLabel(path: string) {
  return FIELD_LABELS[path] ?? path.replace(/_/g, " ");
}

function parseIssues(input: unknown): ZodIssueLike[] | null {
  if (Array.isArray(input)) return input as ZodIssueLike[];
  if (typeof input === "string") {
    const start = input.indexOf("[");
    const end = input.lastIndexOf("]");
    if (start === -1 || end <= start) return null;
    try {
      const parsed = JSON.parse(input.slice(start, end + 1));
      return Array.isArray(parsed) ? (parsed as ZodIssueLike[]) : null;
    } catch {
      return null;
    }
  }
  return null;
}

/** Formats an unknown error (Error, Zod issue JSON, string) into a short sentence. */
export function formatFormError(error: unknown, fallback = "Something went wrong."): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : String(error ?? "");
  const issues = parseIssues(raw);
  if (issues?.length) {
    const parts = issues.slice(0, 3).map((issue) => {
      const path = Array.isArray(issue.path) ? issue.path.filter(Boolean).join(".") : "";
      const message = typeof issue.message === "string" ? issue.message : "is invalid";
      return path ? `${fieldLabel(path)}: ${message}` : message;
    });
    const extra = issues.length > 3 ? ` (+${issues.length - 3} more)` : "";
    return `Please fix: ${parts.join("; ")}${extra}`;
  }
  return raw.trim() || fallback;
}
