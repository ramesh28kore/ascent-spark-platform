/** Donut chart showing solved problems out of the total, LeetCode-style. */
export function ProgressRing({
  solved,
  total,
  size = 140,
  stroke = 10,
}: {
  solved: number;
  total: number;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = total ? Math.min(1, solved / total) : 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference * ratio} ${circumference}`}
          className="stroke-primary transition-[stroke-dasharray] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-bold tabular-nums leading-none">{solved}</span>
        <span className="text-xs text-muted-foreground">/ {total} solved</span>
      </div>
    </div>
  );
}
