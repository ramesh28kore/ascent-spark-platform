import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";

import { Skeleton } from "@/components/ui/skeleton";

const Monaco = lazy(async () => {
  const mod = await import("@monaco-editor/react");
  return { default: mod.default };
});

/**
 * Monaco is browser-only, so it is lazily imported behind ClientOnly and never
 * evaluated during server rendering.
 */
export function CodeEditor({
  value,
  onChange,
  language = "python",
  height = 380,
  readOnly = false,
}: {
  value: string;
  onChange: (v: string) => void;
  language?: string;
  height?: number;
  readOnly?: boolean;
}) {
  const fallback = <Skeleton style={{ height }} className="w-full rounded-md" />;

  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <div className="overflow-hidden rounded-md border">
          <Monaco
            height={height}
            language={language}
            theme="vs-dark"
            value={value}
            onChange={(v) => onChange(v ?? "")}
            options={{
              readOnly,
              fontSize: 13,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              tabSize: 4,
              automaticLayout: true,
              padding: { top: 12, bottom: 12 },
              quickSuggestions: true,
              suggestOnTriggerCharacters: true,
              wordBasedSuggestions: "currentDocument",
              renderLineHighlight: "line",
              smoothScrolling: true,
            }}
          />
        </div>
      </Suspense>
    </ClientOnly>
  );
}
