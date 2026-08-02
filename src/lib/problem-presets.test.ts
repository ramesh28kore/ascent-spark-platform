import { describe, expect, it } from "vitest";

import {
  EMPTY_FILTERS,
  PRESETS,
  isDirty,
  matchPreset,
  parseFilters,
  serialiseFilters,
} from "./problem-presets";

const withPreset = (id: string) => ({
  ...EMPTY_FILTERS,
  ...PRESETS.find((p) => p.id === id)!.patch,
});

describe("matchPreset", () => {
  it("recognises every preset from its expanded filter state", () => {
    for (const preset of PRESETS) {
      expect(matchPreset(withPreset(preset.id))).toBe(preset.id);
    }
  });

  it("ignores level ordering", () => {
    const grind = withPreset("grind");
    expect(matchPreset({ ...grind, levels: ["hard", "medium"] })).toBe("grind");
  });

  it("returns null once a filter drifts from the preset", () => {
    expect(matchPreset({ ...withPreset("warmup"), q: "tree" })).toBeNull();
  });
});

describe("isDirty", () => {
  it("is false for the empty state and true for any active filter", () => {
    expect(isDirty(EMPTY_FILTERS)).toBe(false);
    expect(isDirty({ ...EMPTY_FILTERS, q: "sum" })).toBe(true);
    expect(isDirty({ ...EMPTY_FILTERS, levels: ["easy"] })).toBe(true);
    expect(isDirty({ ...EMPTY_FILTERS, tags: ["dp"] })).toBe(true);
    expect(isDirty({ ...EMPTY_FILTERS, status: "solved" })).toBe(true);
    expect(isDirty({ ...EMPTY_FILTERS, fav: true })).toBe(true);
    expect(isDirty({ ...EMPTY_FILTERS, sort: "title" })).toBe(true);
  });

  it("does not treat direction alone as dirty", () => {
    expect(isDirty({ ...EMPTY_FILTERS, dir: "desc" })).toBe(false);
  });
});

describe("parseFilters", () => {
  it("falls back to defaults for unknown values", () => {
    expect(parseFilters({ status: "nope", sort: "nope", dir: "sideways" })).toEqual(EMPTY_FILTERS);
    expect(parseFilters({})).toEqual(EMPTY_FILTERS);
  });

  it("reads csv lists, drops unknown levels and trims blanks", () => {
    const parsed = parseFilters({ levels: "easy, hard ,plaid", tags: "dp, , graphs" });
    expect(parsed.levels).toEqual(["easy", "hard"]);
    expect(parsed.tags).toEqual(["dp", "graphs"]);
  });

  it("caps query length and tag count", () => {
    const parsed = parseFilters({
      q: "x".repeat(200),
      tags: Array.from({ length: 20 }, (_, i) => `t${i}`).join(","),
    });
    expect(parsed.q).toHaveLength(60);
    expect(parsed.tags).toHaveLength(12);
  });

  it("accepts favourites as boolean or string", () => {
    expect(parseFilters({ fav: true }).fav).toBe(true);
    expect(parseFilters({ fav: "true" }).fav).toBe(true);
    expect(parseFilters({ fav: "0" }).fav).toBe(false);
  });
});

describe("serialiseFilters", () => {
  it("omits defaults", () => {
    expect(serialiseFilters(EMPTY_FILTERS)).toEqual({});
  });

  it("emits direction alongside a non-default sort", () => {
    expect(serialiseFilters({ ...EMPTY_FILTERS, sort: "acceptance", dir: "desc" })).toEqual({
      sort: "acceptance",
      dir: "desc",
    });
  });

  it("round-trips a populated filter state", () => {
    const filters = {
      ...EMPTY_FILTERS,
      q: "two sum",
      levels: ["easy", "medium"],
      tags: ["array", "dp"],
      status: "todo",
      company: "Infosys",
      fav: true,
      sort: "difficulty" as const,
      dir: "desc" as const,
    };
    expect(parseFilters(serialiseFilters(filters) as Record<string, unknown>)).toEqual(filters);
  });
});
