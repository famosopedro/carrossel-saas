import { FG, MUTED, LINE, BRAND, SANS } from "@/lib/ui";

type Point = { label: string; value: number };

// Gráfico de barras SVG responsivo (sem dependência externa).
export default function MiniChart({ data, height = 180 }: { data: Point[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length || 1;
  const W = 600; // viewBox interno; o SVG estica via width:100%
  const H = height;
  const padB = 26, padT = 12;
  const chartH = H - padB - padT;
  const gap = 10;
  const barW = (W - gap * (n - 1)) / n;

  // linhas de grade (4)
  const grid = [0.25, 0.5, 0.75, 1].map((f) => padT + chartH * (1 - f));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none"
      style={{ fontFamily: SANS, display: "block" }} role="img" aria-label="Gráfico de barras">
      {grid.map((y, i) => (
        <line key={i} x1={0} x2={W} y1={y} y2={y} stroke={LINE} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}
      {data.map((d, i) => {
        const h = (d.value / max) * chartH;
        const x = i * (barW + gap);
        const y = padT + chartH - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={Math.max(h, d.value > 0 ? 2 : 0)} rx={3}
              fill={i === n - 1 ? BRAND : "rgba(237,237,237,0.22)"} />
            <text x={x + barW / 2} y={H - 9} textAnchor="middle" fontSize={11} fill={MUTED}
              style={{ fontSize: 11 }}>{d.label}</text>
            {d.value > 0 && (
              <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize={11} fontWeight={600} fill={FG}
                style={{ fontSize: 11, fontWeight: 600 }}>{d.value}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
