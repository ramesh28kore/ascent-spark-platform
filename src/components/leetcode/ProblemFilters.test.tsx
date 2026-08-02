import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProblemFilters } from "./ProblemFilters";
import { EMPTY_FILTERS, type ProblemFilters as Filters } from "@/lib/problem-presets";

const setup = (filters: Filters = EMPTY_FILTERS) => {
  const onChange = vi.fn();
  render(
    <ProblemFilters
      filters={filters}
      onChange={onChange}
      tagCounts={[
        { tag: "array", count: 12 },
        { tag: "dp", count: 4 },
      ]}
      companies={["Infosys", "TCS"]}
      favouriteCount={3}
      shown={10}
      total={37}
    />,
  );
  return { onChange };
};

describe("ProblemFilters", () => {
  it("renders the search box and the result count", () => {
    setup();
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    expect(screen.getByText(/37/)).toBeInTheDocument();
  });

  it("reports typed search text to the parent", async () => {
    const { onChange } = setup();
    await userEvent.type(screen.getByPlaceholderText(/search/i), "tree");
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls.at(-1)![0]).toMatchObject({ q: "e" });
  });

  it("applies a preset when its chip is clicked", async () => {
    const { onChange } = setup();
    await userEvent.click(screen.getByRole("button", { name: /easy warm-up/i }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ levels: ["easy"], status: "todo" }),
    );
  });
});
