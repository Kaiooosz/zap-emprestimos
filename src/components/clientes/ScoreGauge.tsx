"use client";

import { getFaixa } from "@/lib/score/calcularScore";

interface ScoreGaugeProps {
  score: number;
  size?: number;
}

export function ScoreGauge({ score, size = 180 }: ScoreGaugeProps) {
  const { label } = getFaixa(score);

  const cx = size / 2;
  const cy = size / 2 + 8;
  const r  = size * 0.38;
  const strokeWidth = size * 0.075;

  const startAngle = -210;
  const endAngle   = 30;
  const totalAngle = endAngle - startAngle;

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

  function scoreToAngle(s: number) {
    return startAngle + (s / 1000) * totalAngle;
  }

  const fillAngle  = scoreToAngle(score);
  const needleAngle = fillAngle;
  const needleTip   = polarToXY(needleAngle, r * 0.82);
  const needleBase1 = polarToXY(needleAngle + 90, r * 0.07);
  const needleBase2 = polarToXY(needleAngle - 90, r * 0.07);

  // Cor única baseada na faixa — tons de azul/slate, sem saturação excessiva
  const fillColor = score >= 850 ? "#1d4ed8"
    : score >= 700 ? "#2563eb"
    : score >= 500 ? "#64748b"
    : score >= 300 ? "#94a3b8"
    : "#cbd5e1";

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.78} viewBox={`0 0 ${size} ${size * 0.78}`}>
        {/* Trilho */}
        <path
          d={arcPath(startAngle, endAngle, r)}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Preenchimento */}
        {score > 0 && (
          <path
            d={arcPath(startAngle, fillAngle, r)}
            fill="none"
            stroke={fillColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}
        {/* Agulha */}
        <polygon
          points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
          fill={fillColor}
          opacity={0.8}
        />
        <circle cx={cx} cy={cy} r={strokeWidth * 0.45} fill={fillColor} />
        <circle cx={cx} cy={cy} r={strokeWidth * 0.22} fill="white" />
        {/* Score */}
        <text x={cx} y={cy - r * 0.22} textAnchor="middle" fontSize={size * 0.2} fontWeight="800"
          fill="#0f172a" fontFamily="'Plus Jakarta Sans', sans-serif">
          {score}
        </text>
        <text x={cx} y={cy - r * 0.01} textAnchor="middle" fontSize={size * 0.068}
          fill="#94a3b8" fontFamily="'Plus Jakarta Sans', sans-serif">
          de 1000
        </text>
        <text x={cx} y={cy + r * 0.18} textAnchor="middle" fontSize={size * 0.072} fontWeight="600"
          fill={fillColor} fontFamily="'Plus Jakarta Sans', sans-serif">
          {label}
        </text>
      </svg>
    </div>
  );
}
