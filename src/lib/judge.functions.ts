import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const runInput = z.object({
  language: z.enum(["python", "javascript"]).default("python"),
  code: z.string().trim().min(1, { message: "write some code first" }).max(20000),
  stdin: z.string().max(10000).default(""),
});

/** Runs arbitrary student code in the hosted sandbox and returns stdout/stderr. */
export const runCodeRemote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => runInput.parse(input))
  .handler(async ({ data }) => {
    const { executeCode } = await import("@/lib/judge.server");
    const result = await executeCode({
      language: data.language,
      code: data.code,
      stdin: data.stdin,
      timeoutMs: 8000,
    });
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      output: result.output,
      runtime_ms: result.runtime_ms,
      memory_kb: result.memory_kb,
      error: result.error ?? null,
      timed_out: result.timed_out,
    };
  });
