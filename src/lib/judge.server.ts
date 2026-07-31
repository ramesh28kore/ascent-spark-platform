/**
 * Server-side code execution.
 *
 * Default backend is the public Judge0 CE endpoint. Set JUDGE0_URL (and
 * JUDGE0_KEY / JUDGE0_HOST for RapidAPI or a self-hosted instance) to point at
 * a private judge without touching the call sites.
 */

const DEFAULT_JUDGE0 = "https://ce.judge0.com";

const LANGUAGE_ID: Record<string, number> = {
  python: 71, // Python 3.8.1
  javascript: 63, // Node.js 12
};

export type ExecResult = {
  stdout: string;
  stderr: string;
  output: string;
  status: string;
  runtime_ms: number;
  memory_kb: number;
  timed_out: boolean;
  error?: string;
};

const cap = (value: string, limit = 8000) =>
  value.length > limit ? `${value.slice(0, limit)}\n…output truncated` : value;

export async function executeCode(args: {
  language: string;
  code: string;
  stdin?: string;
  timeoutMs?: number;
  memoryKb?: number;
}): Promise<ExecResult> {
  const base = (process.env.JUDGE0_URL || DEFAULT_JUDGE0).replace(/\/$/, "");
  const apiKey = process.env.JUDGE0_KEY;
  const apiHost = process.env.JUDGE0_HOST;
  const languageId = LANGUAGE_ID[args.language] ?? LANGUAGE_ID.python;
  const cpuSeconds = Math.min(Math.max((args.timeoutMs ?? 5000) / 1000, 1), 15);

  const empty: ExecResult = {
    stdout: "",
    stderr: "",
    output: "",
    status: "error",
    runtime_ms: 0,
    memory_kb: 0,
    timed_out: false,
  };

  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), cpuSeconds * 1000 + 20000);

  try {
    const response = await fetch(`${base}/submissions?base64_encoded=false&wait=true`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "X-RapidAPI-Key": apiKey } : {}),
        ...(apiHost ? { "X-RapidAPI-Host": apiHost } : {}),
      },
      body: JSON.stringify({
        language_id: languageId,
        source_code: args.code,
        stdin: args.stdin ?? "",
        cpu_time_limit: cpuSeconds,
        wall_time_limit: Math.min(cpuSeconds + 5, 20),
        memory_limit: Math.min(args.memoryKb ?? 128000, 512000),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return {
        ...empty,
        error:
          response.status === 429
            ? "The code sandbox is busy right now. Wait a few seconds and run again."
            : `Sandbox error [${response.status}]: ${body.slice(0, 300)}`,
      };
    }

    const payload = (await response.json()) as {
      stdout?: string | null;
      stderr?: string | null;
      compile_output?: string | null;
      message?: string | null;
      time?: string | null;
      memory?: number | null;
      status?: { id: number; description: string };
    };

    const statusId = payload.status?.id ?? 0;
    const stderr = cap(
      [payload.compile_output, payload.stderr, statusId >= 6 ? payload.message : null]
        .filter(Boolean)
        .join("\n")
        .trim(),
    );

    return {
      stdout: cap(payload.stdout ?? ""),
      stderr,
      output: cap(`${payload.stdout ?? ""}${stderr ? `\n${stderr}` : ""}`.trim()),
      status: payload.status?.description ?? "unknown",
      runtime_ms: Math.round(Number(payload.time ?? 0) * 1000),
      memory_kb: Math.round(payload.memory ?? 0),
      timed_out: statusId === 5,
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      ...empty,
      timed_out: aborted,
      error: aborted
        ? "Execution timed out."
        : `Could not reach the code sandbox: ${(error as Error).message}`,
    };
  } finally {
    clearTimeout(abortTimer);
  }
}

export type CaseResult = {
  index: number;
  hidden: boolean;
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  runtime_ms: number;
  error?: string;
};

const normalise = (value: string) =>
  value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();

export async function judgeAgainstCases(args: {
  language: string;
  code: string;
  cases: { input: string; expected_output: string; hidden: boolean }[];
  timeoutMs?: number;
  memoryKb?: number;
}) {
  const results: CaseResult[] = [];
  let runtime = 0;
  let memory = 0;
  let unreachable = false;

  for (const [index, testCase] of args.cases.entries()) {
    const run = await executeCode({
      language: args.language,
      code: args.code,
      stdin: testCase.input,
      timeoutMs: args.timeoutMs,
      memoryKb: args.memoryKb,
    });

    if (run.error?.includes("sandbox")) unreachable = true;
    runtime = Math.max(runtime, run.runtime_ms);
    memory = Math.max(memory, run.memory_kb);

    results.push({
      index,
      hidden: testCase.hidden,
      passed:
        !run.error &&
        !run.stderr.trim() &&
        normalise(run.stdout) === normalise(testCase.expected_output),
      input: testCase.input,
      expected: testCase.expected_output,
      actual: normalise(run.stdout),
      runtime_ms: run.runtime_ms,
      error: run.error ?? (run.stderr.trim() || undefined),
    });
  }

  return {
    results,
    passed: results.filter((result) => result.passed).length,
    total: results.length,
    runtime_ms: runtime,
    memory_kb: memory,
    unreachable,
  };
}
