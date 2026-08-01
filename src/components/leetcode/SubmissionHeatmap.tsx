/** Shared 12-month submission heatmap + streak helpers. */

const DAY = 86_400_000;

export const dayKey = (d: Date | string) => new Date(d).toISOString().slice(0, 10);

/** Counts submissions per day from timestamps. */
export function countByDay(dates: (string | Date)[]) {
  const map = new Map<string, number>();
  for (const d of dates) {
    const key = dayKey(d);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

/** Consecutive days with activity, ending today or yesterday. */
export function streakFromCounts(counts: Map<string, number>) {
  const day = new Date();
  if (!counts.has(dayKey(day))) day.setDate(day.getDate() - 1);
  let n = 0;
  while (counts.has(dayKey(day))) {
    n += 1;
    day.setDate(day.getDate() - 1);
  }
  return n;
}

export function SubmissionHeatmap({ counts }: { counts: Map<string, number> }) {
  const today = new Date();
  const cells: { key: string; count: number }[] = [];
  for (let i = 363; i >= 0; i -= 1) {
    const key = dayKey(new Date(today.getTime() - i * DAY));
    cells.push({ key, count: counts.get(key) ?? 0 });
  }

  return (
    <div className="grid grid-flow-col grid-rows-7 gap-[3px]">
      {cells.map((cell) => (
        <span
          key={cell.key}
          title={`${cell.key}: ${cell.count} submission${cell.count === 1 ? "" : "s"}`}
          className={`size-[10px] rounded-[2px] ${
            cell.count === 0
              ? "bg-muted"
              : cell.count < 3
                ? "bg-emerald-300 dark:bg-emerald-900"
                : cell.count < 6
                  ? "bg-emerald-500 dark:bg-emerald-700"
                  : "bg-emerald-700 dark:bg-emerald-500"
          }`}
        />
      ))}
    </div>
  );
}
