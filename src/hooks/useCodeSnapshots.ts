import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { latestSnapshot, listSnapshots, saveSnapshot } from "@/lib/snapshots.functions";

export type SnapshotScope = {
  scope_kind: "practice" | "exam" | "playground";
  problem_id?: string | null;
  question_id?: string | null;
  test_id?: string | null;
  attempt_id?: string | null;
};

export type CodeSnapshot = {
  id: string;
  language: string;
  code: string;
  label: string;
  created_at: string;
};

const normalise = (scope: SnapshotScope) => ({
  scope_kind: scope.scope_kind,
  problem_id: scope.problem_id ?? null,
  question_id: scope.question_id ?? null,
  test_id: scope.test_id ?? null,
  attempt_id: scope.attempt_id ?? null,
});

/**
 * Debounced autosave + version history for a code editor buffer.
 * Snapshots are stored server-side and scoped per problem / exam attempt.
 */
export function useCodeSnapshots({
  scope,
  language,
  code,
  enabled = true,
}: {
  scope: SnapshotScope;
  language: string;
  code: string;
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const save = useServerFn(saveSnapshot);
  const list = useServerFn(listSnapshots);
  const latest = useServerFn(latestSnapshot);

  const key = normalise(scope);
  const scopeKey = useMemo(
    () => [key.scope_kind, key.problem_id, key.question_id, key.attempt_id].join("|"),
    [key.scope_kind, key.problem_id, key.question_id, key.attempt_id],
  );

  const ready =
    enabled &&
    (key.scope_kind === "playground" || !!key.problem_id || !!key.question_id);

  const history = useQuery({
    queryKey: ["code-snapshots", scopeKey],
    queryFn: () => list({ data: key }) as Promise<CodeSnapshot[]>,
    enabled: ready,
  });

  const resume = useQuery({
    queryKey: ["code-snapshot-latest", scopeKey, language],
    queryFn: () => latest({ data: { ...key, language } }) as Promise<CodeSnapshot | null>,
    enabled: ready,
    staleTime: Infinity,
  });

  const lastSaved = useRef<string>("");
  useEffect(() => {
    lastSaved.current = "";
  }, [scopeKey, language]);

  const persist = useMutation({
    mutationFn: (input: { code: string; label: "autosave" | "manual" | "submitted" }) =>
      save({ data: { ...key, language, code: input.code, label: input.label } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["code-snapshots", scopeKey] }),
  });
  const persistRef = useRef(persist.mutate);
  persistRef.current = persist.mutate;

  // Debounced autosave — only writes when the buffer actually changed.
  useEffect(() => {
    if (!ready || !code.trim()) return;
    if (code === lastSaved.current) return;
    const id = window.setTimeout(() => {
      lastSaved.current = code;
      persistRef.current({ code, label: "autosave" });
    }, 5000);
    return () => window.clearTimeout(id);
  }, [code, ready, scopeKey, language]);

  const snapshotNow = useCallback(
    (label: "manual" | "submitted" = "manual", value?: string) => {
      const body = value ?? code;
      if (!ready || !body.trim()) return;
      lastSaved.current = body;
      persistRef.current({ code: body, label });
    },
    [code, ready],
  );

  return {
    snapshots: history.data ?? [],
    isLoadingHistory: history.isLoading,
    resumed: resume.data ?? null,
    resumeReady: !ready || resume.isFetched,
    saving: persist.isPending,
    snapshotNow,
  };
}
