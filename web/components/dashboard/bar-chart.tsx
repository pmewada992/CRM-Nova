export function BarChart({
  title,
  data,
  formatValue = (v) => v.toLocaleString(),
}: {
  title: string;
  data: { label: string; value: number }[];
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-4 text-sm font-medium text-muted-foreground">{title}</h3>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <div className="flex h-40 items-end gap-3">
          {data.map((d) => (
            <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs font-medium tabular-nums">{formatValue(d.value)}</span>
              <div
                className="w-full max-w-6 rounded-t bg-primary"
                style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }}
                title={`${d.label}: ${formatValue(d.value)}`}
              />
              <span className="max-w-16 truncate text-xs text-muted-foreground" title={d.label}>
                {d.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
