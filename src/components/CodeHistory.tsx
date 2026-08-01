import { useState } from "react";
import { History, RotateCcw } from "lucide-react";

import type { CodeSnapshot } from "@/hooks/useCodeSnapshots";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const LABELS: Record<string, string> = {
  autosave: "Autosave",
  manual: "Saved",
  submitted: "Submitted",
};

function relative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(iso).toLocaleDateString();
}

/** Line-level diff markers between the current buffer and a snapshot. */
function diffLines(current: string, snapshot: string) {
  const currentSet = new Set(current.split("\n"));
  const snapshotSet = new Set(snapshot.split("\n"));
  return {
    snapshotLines: snapshot
      .split("\n")
      .map((line) => ({ line, added: line.trim() !== "" && !currentSet.has(line) })),
    removedCount: current
      .split("\n")
      .filter((line) => line.trim() !== "" && !snapshotSet.has(line)).length,
  };
}

export function CodeHistory({
  snapshots,
  currentCode,
  loading,
  onRestore,
  trigger,
}: {
  snapshots: CodeSnapshot[];
  currentCode: string;
  loading?: boolean;
  onRestore: (snapshot: CodeSnapshot) => void;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CodeSnapshot | null>(null);
  const active = selected ?? snapshots[0] ?? null;
  const diff = active ? diffLines(currentCode, active.code) : null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline" size="sm" className="gap-1.5">
            <History className="size-4" /> History
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="font-display">Version history</SheetTitle>
          <SheetDescription>
            Your code is autosaved as you type. Restore any earlier version — the current buffer is
            saved first, so nothing is lost.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <p className="px-4 text-sm text-muted-foreground">Loading history…</p>
        ) : snapshots.length === 0 ? (
          <p className="px-4 text-sm text-muted-foreground">
            No saved versions yet — keep typing and a snapshot appears within a few seconds.
          </p>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4">
            <ScrollArea className="max-h-48 rounded-md border">
              <div className="divide-y">
                {snapshots.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelected(s)}
                    className={`flex w-full items-center justify-between gap-3 p-2 text-left text-xs hover:bg-muted/60 ${
                      active?.id === s.id ? "bg-muted" : ""
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {s.code.split("\n").find((l) => l.trim()) ?? "(empty)"}
                      </span>
                      <span className="text-muted-foreground">
                        {relative(s.created_at)} · {s.language}
                      </span>
                    </span>
                    <Badge variant={s.label === "submitted" ? "default" : "secondary"}>
                      {LABELS[s.label] ?? s.label}
                    </Badge>
                  </button>
                ))}
              </div>
            </ScrollArea>

            {active && diff ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {diff.snapshotLines.filter((l) => l.added).length} line(s) differ from your
                    editor · {diff.removedCount} line(s) only in the editor
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      onRestore(active);
                      setOpen(false);
                    }}
                  >
                    <RotateCcw className="size-4" /> Restore
                  </Button>
                </div>
                <ScrollArea className="min-h-0 flex-1 rounded-md border bg-muted/30">
                  <pre className="p-3 font-mono text-xs leading-relaxed">
                    {diff.snapshotLines.map((l, i) => (
                      <div
                        key={i}
                        className={
                          l.added ? "bg-emerald-500/15 whitespace-pre-wrap" : "whitespace-pre-wrap"
                        }
                      >
                        {l.line || " "}
                      </div>
                    ))}
                  </pre>
                </ScrollArea>
              </>
            ) : null}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
