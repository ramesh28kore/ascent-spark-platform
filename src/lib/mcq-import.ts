/**
 * Parses MCQ questions written in a plain Notepad-friendly text format.
 *
 * Format (one block per question, blocks separated by a blank line):
 *
 *   Q: What is the time complexity of binary search?
 *   A) O(n)
 *   *B) O(log n)
 *   C) O(n log n)
 *   D) O(1)
 *   MARKS: 1
 *   LEVEL: easy
 *   EXPLANATION: The search space halves each step.
 *
 * The correct option is marked with a leading `*`, or with an `ANSWER: B` line.
 */

export const MCQ_LEVELS = ["easy", "medium", "hard"] as const;
export type McqLevel = (typeof MCQ_LEVELS)[number];

export type ParsedMcq = {
  index: number;
  line: number;
  prompt: string;
  options: string[];
  /** Option text of the correct answer. */
  answer: string;
  /** Letter of the correct answer, for display. */
  answerLetter: string;
  explanation: string;
  level: McqLevel;
  marks: number;
};

export type McqParseIssue = {
  index: number;
  line: number;
  prompt: string;
  message: string;
};

export type McqParseResult = {
  questions: ParsedMcq[];
  issues: McqParseIssue[];
};

export const MCQ_SAMPLE = `Q: What is the time complexity of binary search on a sorted array?
A) O(n)
*B) O(log n)
C) O(n log n)
D) O(1)
MARKS: 1
LEVEL: easy
EXPLANATION: The search space halves on every comparison.

Q: Which data structure follows FIFO ordering?
A) Stack
*B) Queue
C) Binary tree
D) Graph
MARKS: 1
LEVEL: easy`;

const LETTERS = "ABCDEF";

type Block = { lines: { text: string; line: number }[]; start: number };

function splitBlocks(raw: string): Block[] {
  const blocks: Block[] = [];
  let current: Block | null = null;
  raw.split(/\r?\n/).forEach((text, i) => {
    const trimmed = text.trim();
    if (!trimmed) {
      current = null;
      return;
    }
    if (!current) {
      current = { lines: [], start: i + 1 };
      blocks.push(current);
    }
    current.lines.push({ text: trimmed, line: i + 1 });
  });
  return blocks;
}

/** Parses the Notepad MCQ format into questions plus per-block issues. */
export function parseMcqText(raw: string): McqParseResult {
  const questions: ParsedMcq[] = [];
  const issues: McqParseIssue[] = [];

  splitBlocks(raw ?? "").forEach((block, blockIndex) => {
    const index = blockIndex + 1;
    const line = block.start;
    let prompt = "";
    const options: string[] = [];
    const starred: number[] = [];
    let answerLetter = "";
    let explanation = "";
    let level: McqLevel = "medium";
    let marks = 1;
    let badLevel = "";
    let badMarks = "";

    for (const entry of block.lines) {
      const text = entry.text;
      const question = /^Q\s*[:.)-]\s*(.+)$/i.exec(text);
      const option = /^(\*?)\s*([A-Fa-f])\s*[).:-]\s*(.*)$/.exec(text);
      const answer = /^ANS(?:WER)?\s*[:.-]\s*(.+)$/i.exec(text);
      const marksLine = /^MARKS?\s*[:.-]\s*(.+)$/i.exec(text);
      const levelLine = /^(?:LEVEL|DIFFICULTY)\s*[:.-]\s*(.+)$/i.exec(text);
      const explLine = /^(?:EXPLANATION|EXPL)\s*[:.-]\s*(.*)$/i.exec(text);

      if (question && !prompt) {
        prompt = question[1].trim();
      } else if (answer) {
        answerLetter = answer[1].trim().charAt(0).toUpperCase();
      } else if (marksLine) {
        const n = Number(marksLine[1].trim());
        if (!Number.isInteger(n) || n < 1 || n > 20) badMarks = marksLine[1].trim();
        else marks = n;
      } else if (levelLine) {
        const value = levelLine[1].trim().toLowerCase();
        if ((MCQ_LEVELS as readonly string[]).includes(value)) level = value as McqLevel;
        else badLevel = levelLine[1].trim();
      } else if (explLine) {
        explanation = explLine[1].trim();
      } else if (option) {
        if (option[1] === "*") starred.push(options.length);
        options.push(option[3].trim());
      } else if (!prompt) {
        prompt = text;
      } else if (options.length === 0) {
        prompt = `${prompt} ${text}`.trim();
      }
    }

    const fail = (message: string) =>
      issues.push({ index, line, prompt: prompt || block.lines[0].text, message });

    if (!prompt) return fail("No question text found. Start the block with `Q: …`.");
    if (prompt.length < 5) return fail("Question text is too short.");
    if (options.length < 2) return fail("Add at least 2 options as `A) …`, `B) …`.");
    if (options.length > 6) return fail("A question can have at most 6 options.");
    if (options.some((o) => !o)) return fail("One of the options is empty.");
    if (starred.length > 1) return fail("More than one option is starred as correct.");
    if (badMarks) return fail(`MARKS must be a whole number from 1 to 20 (got "${badMarks}").`);
    if (badLevel) return fail(`LEVEL must be easy, medium or hard (got "${badLevel}").`);

    let answerIndex = starred.length === 1 ? starred[0] : -1;
    if (answerIndex < 0 && answerLetter) answerIndex = LETTERS.indexOf(answerLetter);
    if (answerIndex < 0)
      return fail("No correct answer marked. Star the option (`*B) …`) or add `ANSWER: B`.");
    if (answerIndex >= options.length)
      return fail(`ANSWER: ${answerLetter} does not match any listed option.`);

    questions.push({
      index,
      line,
      prompt,
      options,
      answer: options[answerIndex],
      answerLetter: LETTERS[answerIndex],
      explanation,
      level,
      marks,
    });
  });

  return { questions, issues };
}
