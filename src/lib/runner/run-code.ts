/**
 * Browser-only code runner used as a scratchpad inside the test engine.
 * Nothing here is ever persisted or scored — grading stays server-side.
 */

export type RunResult = { output: string; error: string | null; ms: number };

const JS_WORKER_SOURCE = `
self.onmessage = async (e) => {
  const { code, stdin } = e.data;
  const out = [];
  const lines = String(stdin ?? "").split("\\n");
  let cursor = 0;
  const readline = () => (cursor < lines.length ? lines[cursor++] : "");
  const fmt = (v) => {
    if (typeof v === "string") return v;
    try { return JSON.stringify(v); } catch { return String(v); }
  };
  const console = {
    log: (...a) => out.push(a.map(fmt).join(" ")),
    error: (...a) => out.push(a.map(fmt).join(" ")),
    warn: (...a) => out.push(a.map(fmt).join(" ")),
    info: (...a) => out.push(a.map(fmt).join(" ")),
  };
  const prompt = readline;
  try {
    const fn = new Function("console", "readline", "prompt", '"use strict";' + code);
    const r = await fn(console, readline, prompt);
    if (r !== undefined) out.push(fmt(r));
    self.postMessage({ output: out.join("\\n"), error: null });
  } catch (err) {
    self.postMessage({ output: out.join("\\n"), error: String((err && err.stack) || err) });
  }
};
`;

export function runJavaScript(code: string, stdin: string, timeoutMs = 5000): Promise<RunResult> {
  const started = performance.now();
  return new Promise((resolve) => {
    let worker: Worker;
    let url: string;
    try {
      url = URL.createObjectURL(new Blob([JS_WORKER_SOURCE], { type: "text/javascript" }));
      worker = new Worker(url);
    } catch (e) {
      return resolve({ output: "", error: String(e), ms: 0 });
    }
    const done = (r: Omit<RunResult, "ms">) => {
      window.clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve({ ...r, ms: Math.round(performance.now() - started) });
    };
    const timer = window.setTimeout(
      () =>
        done({
          output: "",
          error: `Timed out after ${timeoutMs / 1000}s (possible infinite loop).`,
        }),
      timeoutMs,
    );
    worker.onmessage = (e) => done(e.data as Omit<RunResult, "ms">);
    worker.onerror = (e) => done({ output: "", error: e.message || "Worker error" });
    worker.postMessage({ code, stdin });
  });
}

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

type Pyodide = {
  setStdout: (o: { batched: (s: string) => void }) => void;
  setStderr: (o: { batched: (s: string) => void }) => void;
  setStdin: (o: { stdin: () => string }) => void;
  runPythonAsync: (code: string) => Promise<unknown>;
};

let pyodidePromise: Promise<Pyodide> | null = null;

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) return resolve();
    const el = document.createElement("script");
    el.src = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error("Failed to load the Python runtime."));
    document.head.appendChild(el);
  });
}

export function loadPython(): Promise<Pyodide> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      await loadScript(`${PYODIDE_URL}pyodide.js`);
      const g = window as unknown as {
        loadPyodide: (o: { indexURL: string }) => Promise<Pyodide>;
      };
      return g.loadPyodide({ indexURL: PYODIDE_URL });
    })().catch((e) => {
      pyodidePromise = null;
      throw e;
    });
  }
  return pyodidePromise;
}

export async function runPython(code: string, stdin: string): Promise<RunResult> {
  const started = performance.now();
  const out: string[] = [];
  try {
    const py = await loadPython();
    const lines = String(stdin ?? "").split("\n");
    let cursor = 0;
    py.setStdout({ batched: (s) => out.push(s) });
    py.setStderr({ batched: (s) => out.push(s) });
    py.setStdin({ stdin: () => (cursor < lines.length ? lines[cursor++] : "") });
    await py.runPythonAsync(code);
    return { output: out.join("\n"), error: null, ms: Math.round(performance.now() - started) };
  } catch (err) {
    return {
      output: out.join("\n"),
      error: err instanceof Error ? err.message : String(err),
      ms: Math.round(performance.now() - started),
    };
  }
}
