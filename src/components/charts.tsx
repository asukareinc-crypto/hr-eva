/**
 * 軽量 SVG チャート群（外部ライブラリ非依存）
 */

const COLORS = ["#4f46e5", "#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe"];

export function DonutChart({
  data,
  centerLabel,
  size = 160,
  thickness = 22,
}: {
  data: { label: string; value: number; color?: string }[];
  centerLabel?: string;
  size?: number;
  thickness?: number;
}) {
  const total = data.reduce((acc, d) => acc + d.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="inline-flex items-center justify-center relative">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={thickness}
          />
          {data.map((d, i) => {
            const dash = (d.value / total) * circumference;
            const seg = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={d.color ?? COLORS[i % COLORS.length]}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += dash;
            return seg;
          })}
        </g>
      </svg>
      {centerLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{centerLabel}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DonutLegend({
  data,
}: {
  data: { label: string; value: number; total?: number; color?: string }[];
}) {
  return (
    <ul className="space-y-1.5 text-sm">
      {data.map((d, i) => (
        <li key={i} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: d.color ?? COLORS[i % COLORS.length] }}
            />
            <span className="text-slate-700">{d.label}</span>
          </span>
          <span className="font-mono text-slate-600 text-xs">
            <span className="font-bold text-slate-900 text-sm">{d.value}</span>
            {d.total != null && <span> / {d.total}名</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function LineChart({
  points,
  width = 320,
  height = 80,
  yMin = 1,
  yMax = 5,
  color = "#4f46e5",
}: {
  points: { label: string; value: number | null }[];
  width?: number;
  height?: number;
  yMin?: number;
  yMax?: number;
  color?: string;
}) {
  const padX = 4;
  const padY = 8;
  const valid = points.filter((p) => p.value != null);
  if (valid.length === 0) {
    return (
      <div className="text-xs text-slate-400 text-center py-8">データがありません</div>
    );
  }
  const xStep = (width - padX * 2) / Math.max(1, points.length - 1);
  const norm = (v: number) =>
    height - padY - ((v - yMin) / (yMax - yMin)) * (height - padY * 2);

  // build path skipping null
  let pathD = "";
  let started = false;
  points.forEach((p, i) => {
    if (p.value == null) return;
    const x = padX + i * xStep;
    const y = norm(p.value);
    pathD += (started ? " L " : " M ") + x.toFixed(1) + " " + y.toFixed(1);
    started = true;
  });

  // 軽い面の塗り（グラデーション）
  let areaD = pathD;
  if (areaD) {
    const last = valid[valid.length - 1];
    const lastIdx = points.findIndex((p) => p === last);
    const lastX = padX + lastIdx * xStep;
    const firstIdx = points.findIndex((p) => p.value != null);
    const firstX = padX + firstIdx * xStep;
    areaD += ` L ${lastX} ${height - padY} L ${firstX} ${height - padY} Z`;
  }

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {/* 面 */}
        {areaD && <path d={areaD} fill="url(#lineGrad)" />}
        {/* 線 */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* 点 */}
        {points.map((p, i) => {
          if (p.value == null) return null;
          const x = padX + i * xStep;
          const y = norm(p.value);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="3"
              fill="white"
              stroke={color}
              strokeWidth="2"
            />
          );
        })}
      </svg>
      <div
        className="grid mt-1 text-[10px] text-slate-500 text-center"
        style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}
      >
        {points.map((p, i) => (
          <div key={i}>{p.label}</div>
        ))}
      </div>
    </div>
  );
}
