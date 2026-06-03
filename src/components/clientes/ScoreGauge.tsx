"use client";

import { getFaixa } from "@/lib/score/calcularScore";

interface ScoreGaugeProps {
  score: number;
  size?: number;
}

export function ScoreGauge({ score, size = 200 }: ScoreGaugeProps) {
  const { label, color } = getFaixa(score);

  // Arco de 220° centrado no bottom (de -200° a +40°)
  const startAngle = -220;
  const endAngle   = 40;
  const totalAngle = endAngle - startAngle; // 260°
  const cx = size / 2;
  const cy = size / 2 + 10;
  const r  = size * 0.38;
  const strokeWidth = size * 0.09;

  function polarToXY(angleDeg: number, radius: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  function arcPath(startDeg: number, endDeg: number, radius: number) {
    const s = polarToXY(startDeg, radius);
    const e = polarToXY(endDeg,   radius);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  // Zonas do arco (0-1000)
  const zonas = [
    { from: 0,   to: 300,  color: "#ef4444" },
    { from: 300, to: 500,  color: "#f97316" },
    { from: 500, to: 700,  color: "#f59e0b" },
    { from: 700, to: 850,  color: "#6A95B4" },
    { from: 850, to: 1000, color: "#22c55e" },
  ];

  function scoreToAngle(s: number) {
    return startAngle + (s / 1000) * totalAngle;
  }

  // Agulha
  const needleAngle = scoreToAngle(score);
  const needleTip  = polarToXY(needleAngle, r * 0.85);
  const needleBase1 = polarToXY(needleAngle + 90, r * 0.08);
  const needleBase2 = polarToXY(needleAngle - 90, r * 0.08);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.82} viewBox={`0 0 ${size} ${size * 0.82}`}>
        {/* Fundo do arco */}
        <path
          d={arcPath(startAngle, endAngle, r)}
          fill="none"
          stroke="#152035"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Zonas coloridas */}
        {zonas.map((z) => {
          const sA = scoreToAngle(z.from);
          const eA = scoreToAngle(z.to);
          return (
            <path
              key={z.from}
              d={arcPath(sA, eA, r)}
              fill="none"
              stroke={z.color}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
              opacity={score >= z.from ? 1 : 0.18}
            />
          );
        })}

        {/* Arco preenchido até o score */}
        <path
          d={arcPath(startAngle, scoreToAngle(score), r)}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth - 4}
          strokeLinecap="round"
          opacity={0}
        />

        {/* Agulha */}
        <polygon
          points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
          fill={color}
          opacity={0.9}
        />
        <circle cx={cx} cy={cy} r={strokeWidth * 0.4} fill={color} opacity={0.9} />
        <circle cx={cx} cy={cy} r={strokeWidth * 0.2} fill="#070f1c" />

        {/* Marcadores de faixa */}
        {[0, 300, 500, 700, 850, 1000].map((s) => {
          const a = scoreToAngle(s);
          const inner = polarToXY(a, r - strokeWidth / 2 - 3);
          const outer = polarToXY(a, r + strokeWidth / 2 + 3);
          return <line key={s} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#070f1c" strokeWidth={1.5} />;
        })}

        {/* Score */}
        <text x={cx} y={cy - r * 0.28} textAnchor="middle" fontSize={size * 0.18} fontWeight="800"
          fill={color} fontFamily="'Plus Jakarta Sans', sans-serif">
          {score}
        </text>
        <text x={cx} y={cy - r * 0.08} textAnchor="middle" fontSize={size * 0.065}
          fill="#6a85a0" fontFamily="'Plus Jakarta Sans', sans-serif">
          de 1000 pontos
        </text>
        <text x={cx} y={cy + r * 0.12} textAnchor="middle" fontSize={size * 0.075} fontWeight="600"
          fill={color} fontFamily="'Plus Jakarta Sans', sans-serif">
          {label}
        </text>
      </svg>

      {/* Legenda */}
      <div className="flex items-center gap-3 mt-1 flex-wrap justify-center">
        {[
          { label: "Muito Alto Risco", color: "#ef4444", range: "0–300" },
          { label: "Alto Risco",       color: "#f97316", range: "301–500" },
          { label: "Regular",          color: "#f59e0b", range: "501–700" },
          { label: "Bom",              color: "#6A95B4", range: "701–850" },
          { label: "Excelente",        color: "#22c55e", range: "851–1000" },
        ].map((z) => (
          <div key={z.label} className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full" style={{ background: z.color }} />
            <span className="text-xs text-slate-500">{z.label}</span>
            <span className="text-xs text-slate-600">({z.range})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
