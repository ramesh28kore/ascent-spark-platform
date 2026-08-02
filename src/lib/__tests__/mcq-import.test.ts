import { describe, expect, it } from "vitest";
import { MCQ_SAMPLE, parseMcqText } from "@/lib/mcq-import";

describe("parseMcqText", () => {
  it("parses the documented sample", () => {
    const { questions, issues } = parseMcqText(MCQ_SAMPLE);
    expect(issues).toHaveLength(0);
    expect(questions).toHaveLength(2);
    expect(questions[0].answer).toBe("O(log n)");
    expect(questions[0].answerLetter).toBe("B");
    expect(questions[0].level).toBe("easy");
    expect(questions[0].marks).toBe(1);
    expect(questions[0].explanation).toContain("halves");
    expect(questions[1].options).toHaveLength(4);
  });

  it("accepts ANSWER: lines instead of a star", () => {
    const { questions, issues } = parseMcqText(
      ["Q: Which keyword declares a constant in JS?", "A) let", "B) const", "ANSWER: B"].join("\n"),
    );
    expect(issues).toHaveLength(0);
    expect(questions[0].answer).toBe("const");
    expect(questions[0].marks).toBe(1);
    expect(questions[0].level).toBe("medium");
  });

  it("reports a block with no correct answer", () => {
    const { questions, issues } = parseMcqText("Q: Pick one\nA) alpha\nB) beta");
    expect(questions).toHaveLength(0);
    expect(issues[0].message).toContain("No correct answer");
    expect(issues[0].line).toBe(1);
  });

  it("rejects duplicate stars and too few options", () => {
    const text = ["Q: Two stars here", "*A) one", "*B) two", "", "Q: Lonely option", "*A) only"].join(
      "\n",
    );
    const { questions, issues } = parseMcqText(text);
    expect(questions).toHaveLength(0);
    expect(issues.map((i) => i.message)).toEqual([
      expect.stringContaining("More than one option"),
      expect.stringContaining("at least 2 options"),
    ]);
  });

  it("validates marks and level values", () => {
    const { issues } = parseMcqText(
      ["Q: Bad marks", "*A) x", "B) y", "MARKS: many", "", "Q: Bad level", "*A) x", "B) y", "LEVEL: tricky"].join(
        "\n",
      ),
    );
    expect(issues[0].message).toContain("MARKS");
    expect(issues[1].message).toContain("LEVEL");
  });

  it("keeps good blocks when a neighbour fails", () => {
    const text = `${MCQ_SAMPLE}\n\nQ: Broken\nA) only one`;
    const { questions, issues } = parseMcqText(text);
    expect(questions).toHaveLength(2);
    expect(issues).toHaveLength(1);
    expect(issues[0].index).toBe(3);
  });

  it("returns nothing for empty input", () => {
    expect(parseMcqText("")).toEqual({ questions: [], issues: [] });
  });
});
