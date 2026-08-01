/**
 * Language-specific starter templates shared by every editor in the app
 * (practice workspace, exam coding questions and the playground).
 */
export type TemplateLanguage = "python" | "javascript";

const PYTHON_TEMPLATE = `import sys

def solve(data: str) -> str:
    """Write your solution here.

    \`data\` holds everything that was piped in on standard input.
    Return the text you want printed, or print directly and return "".
    """
    lines = data.splitlines()
    first = lines[0] if lines else ""
    return first


def main() -> None:
    data = sys.stdin.read()
    out = solve(data)
    if out:
        print(out)


if __name__ == "__main__":
    main()
`;

const JAVASCRIPT_TEMPLATE = `const data = require("fs").readFileSync(0, "utf8");

/**
 * Write your solution here.
 * \`data\` holds everything that was piped in on standard input.
 * Return the text you want printed, or print directly and return "".
 */
function solve(data) {
  const lines = data.split("\\n");
  return lines[0] ?? "";
}

const out = solve(data);
if (out) console.log(out);
`;

export const CODE_TEMPLATES: Record<TemplateLanguage, string> = {
  python: PYTHON_TEMPLATE,
  javascript: JAVASCRIPT_TEMPLATE,
};

/** Rich boilerplate for a language, falling back to Python when unknown. */
export function templateFor(language: string): string {
  return CODE_TEMPLATES[(language as TemplateLanguage) in CODE_TEMPLATES
    ? (language as TemplateLanguage)
    : "python"];
}
