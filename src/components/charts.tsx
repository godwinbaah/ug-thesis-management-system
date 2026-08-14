/**
 * Small, dependency-free chart primitives (plain divs, no chart library).
 * Colors follow the validated palette in docs/System_Design.md — categorical
 * blue/orange/green pass CVD-separation checks; status colors are reserved
 * (green = good, orange = needs attention) and never reused as "series 4".
 */

export function StackedBar({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  return (
    <div>
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-slate-100">
        {segments.map((s) => (
          <div
            key={s.label}
            className="h-full"
            style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }}
            title={`${s.label}: ${s.value}`}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-slate-600">{s.label}</span>
            <span className="font-semibold text-slate-900">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BarList({
  rows,
  color = "#2a78d6",
  emptyLabel = "No data yet.",
}: {
  rows: { label: string; value: number }[];
  color?: string;
  emptyLabel?: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>;
  }
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3 text-sm">
          <span className="w-32 shrink-0 truncate text-slate-600" title={r.label}>
            {r.label}
          </span>
          <div className="h-3 flex-1 rounded-full bg-slate-100">
            <div
              className="h-3 rounded-full transition-[width]"
              style={{ width: `${(r.value / max) * 100}%`, backgroundColor: color }}
              title={`${r.label}: ${r.value}`}
            />
          </div>
          <span className="w-6 shrink-0 text-right font-semibold text-slate-900">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export function StatTile({
  label,
  value,
  icon: Icon,
  gradient,
}: {
  label: string;
  value: number | string;
  icon: (p: { className?: string }) => React.ReactElement;
  gradient: string;
}) {
  return (
    <div className={`rounded-xl bg-gradient-to-br ${gradient} p-4 text-white shadow-sm`}>
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-white/80">{label}</p>
    </div>
  );
}
