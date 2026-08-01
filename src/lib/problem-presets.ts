/** Shared filter model for the problem hub, plus the LeetCode-like presets. */

export type SortKey = "default" | "title" | "acceptance" | "difficulty" | "status" | "submissions";
export type SortDir = "asc" | "desc";

export type ProblemFilters = {
  q: string;
  levels: string[];
  tags: string[];
  status: string;
  company: string;
  fav: boolean;
  sort: SortKey;
  dir: SortDir;
};

export const EMPTY_FILTERS: ProblemFilters = {
  q: "",
  levels: [],
  tags: [],
  status: "all",
  company: "all",
  fav: false,
  sort: "default",
  dir: "asc",
};

export const LEVELS = ["easy", "medium", "hard"] as const;
export const STATUSES = ["all", "todo", "attempted", "solved"] as const;
export const SORT_KEYS: SortKey[] = [
  "default",
  "title",
  "acceptance",
  "difficulty",
  "status",
  "submissions",
];

export const SORT_LABEL: Record<SortKey, string> = {
  default: "Curated order",
  title: "Title",
  acceptance: "Acceptance",
  difficulty: "Difficulty",
  status: "Status",
  submissions: "Most solved",
};

export const LEVEL_RANK: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
export const STATUS_RANK: Record<string, number> = { todo: 0, attempted: 1, solved: 2 };

export type Preset = {
  id: string;
  label: string;
  hint: string;
  /** Applied on top of EMPTY_FILTERS. */
  patch: Partial<ProblemFilters>;
};

export const PRESETS: Preset[] = [
  {
    id: "interview",
    label: "Top interview picks",
    hint: "Your favourites, hardest first",
    patch: { fav: true, sort: "difficulty", dir: "desc" },
  },
  {
    id: "warmup",
    label: "Easy warm-up",
    hint: "Unsolved easy problems",
    patch: { levels: ["easy"], status: "todo", sort: "acceptance", dir: "desc" },
  },
  {
    id: "retry",
    label: "Needs another go",
    hint: "Attempted but not solved",
    patch: { status: "attempted", sort: "acceptance", dir: "desc" },
  },
  {
    id: "grind",
    label: "Hard grind",
    hint: "Unsolved medium and hard",
    patch: { levels: ["medium", "hard"], status: "todo", sort: "difficulty", dir: "asc" },
  },
  {
    id: "popular",
    label: "Most attempted",
    hint: "Where everyone is practising",
    patch: { sort: "submissions", dir: "desc" },
  },
];

/** True when the live filters match a preset exactly (so the chip can light up). */
export function matchPreset(filters: ProblemFilters): string | null {
  for (const preset of PRESETS) {
    const target = { ...EMPTY_FILTERS, ...preset.patch };
    const same =
      target.q === filters.q &&
      target.status === filters.status &&
      target.company === filters.company &&
      target.fav === filters.fav &&
      target.sort === filters.sort &&
      target.dir === filters.dir &&
      target.levels.join() === [...filters.levels].sort().join() &&
      target.tags.join() === [...filters.tags].sort().join();
    if (same) return preset.id;
  }
  return null;
}

export function isDirty(filters: ProblemFilters) {
  return (
    filters.q !== "" ||
    filters.levels.length > 0 ||
    filters.tags.length > 0 ||
    filters.status !== "all" ||
    filters.company !== "all" ||
    filters.fav ||
    filters.sort !== "default"
  );
}

/* --------------------------------------------------- url (de)serialisation */

const csv = (value: unknown) =>
  typeof value === "string" && value.length
    ? value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    : [];

export function parseFilters(search: Record<string, unknown>): ProblemFilters {
  const status = STATUSES.includes(search.status as never) ? String(search.status) : "all";
  const sort = SORT_KEYS.includes(search.sort as SortKey) ? (search.sort as SortKey) : "default";
  return {
    q: typeof search.q === "string" ? search.q.slice(0, 60) : "",
    levels: csv(search.levels).filter((l) => l in LEVEL_RANK),
    tags: csv(search.tags).slice(0, 12),
    status,
    company: typeof search.company === "string" && search.company ? search.company : "all",
    fav: search.fav === true || search.fav === "true",
    sort,
    dir: search.dir === "desc" ? "desc" : "asc",
  };
}

/** Only non-default values end up in the URL, keeping shared links tidy. */
export function serialiseFilters(filters: ProblemFilters): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  if (filters.q) out.q = filters.q;
  if (filters.levels.length) out.levels = filters.levels.join(",");
  if (filters.tags.length) out.tags = filters.tags.join(",");
  if (filters.status !== "all") out.status = filters.status;
  if (filters.company !== "all") out.company = filters.company;
  if (filters.fav) out.fav = true;
  if (filters.sort !== "default") {
    out.sort = filters.sort;
    out.dir = filters.dir;
  } else if (filters.dir !== "asc") {
    out.dir = filters.dir;
  }
  return out;
}
