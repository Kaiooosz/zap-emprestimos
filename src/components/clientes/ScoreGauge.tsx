"use client";

import { getFaixa } from "@/lib/score/calcularScore";

interface ScoreGaugeProps {
  score: number;
  size?: number;
}

export function ScoreGauge({ score, size = 160 }: ScoreGaugeProps) {
  const cx = size / 2;
  const cy = size / 2 + 6;
  const r  = size * 0.38;
  const strokeWidth = size * 0.08;

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

  const fillAngle  = scoreToAngle(Math.max(1, score));
  const needleAngle = fillAngle;
  const needleTip   = polarToXY(needleAngle, r * 0.80);
  const needleBase1 = polarToXY(needleAngle + 90, r * 0.06);
  const needleBase2 = polarToXY(needleAngle - 90, r * 0.06);

  // Quanto mais alto o score, mais escuro o azul
  const trackFill = score >= 700 ? "#1e40af"   // azul muito escuro
    : score >= 500               ? "#1d4ed8"   // azul escuro
    : score >= 300               ? "#64748b"   // slate
    :                              "#94a3b8";  // slate claro

  return (
    <svg width={size} height={size * 0.72} viewBox={`0 0 ${size} ${size * 0.72}`}>
      {/* Trilho */}
      <path d={arcPath(startAngle, endAngle, r)} fill="none"
        stroke="#e2e8f0" strokeWidth={strokeWidth} strokeLinecap="round"/>
      {/* Preenchimento */}
      {score > 0 && (
        <path d={arcPath(startAngle, fillAngle, r)} fill="none"
          stroke={trackFill} strokeWidth={strokeWidth} strokeLinecap="round"/>
      )}
      {/* Agulha */}
      <polygon
        points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
        fill="#0f172a" opacity={0.7}/>
      <circle cx={cx} cy={cy} r={strokeWidth * 0.42} fill="#0f172a"/>
      <circle cx={cx} cy={cy} r={strokeWidth * 0.20} fill="white"/>
      {/* Número */}
      <text x={cx} y={cy - r * 0.18} textAnchor="middle"
        fontSize={size * 0.22} fontWeight="800" fill="#0f172a"
        fontFamily="'Plus Jakarta Sans', sans-serif">
        {score}
      </text>
      <text x={cx} y={cy + r * 0.12} textAnchor="middle"
        fontSize={size * 0.072} fill="#94a3b8"
        fontFamily="'Plus Jakarta Sans', sans-serif">
        de 1000 pontos
      </text>
    </svg>
  );
}
