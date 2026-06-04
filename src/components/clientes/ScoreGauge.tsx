"use client";

interface ScoreGaugeProps {
  score: number;
  size?: number;
}

export function ScoreGauge({ score, size = 140 }: ScoreGaugeProps) {
  const cx = size / 2;
  const cy = size / 2 + 4;
  const r  = size * 0.40;
  const strokeWidth = size * 0.10;

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

  const fillAngle   = scoreToAngle(Math.max(1, score));
  const needleAngle = fillAngle;
  const needleTip   = polarToXY(needleAngle, r * 0.78);
  const needleBase1 = polarToXY(needleAngle + 90, r * 0.07);
  const needleBase2 = polarToXY(needleAngle - 90, r * 0.07);

  const trackFill = score >= 700 ? "#1e3a8a"
    : score >= 500               ? "#1d4ed8"
    : score >= 300               ? "#64748b"
    :                              "#94a3b8";

  const svgH = size * 0.68;

  return (
    <svg width={size} height={svgH} viewBox={`0 0 ${size} ${svgH}`}>
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
        fill="#0f172a" opacity={0.6}/>
      <circle cx={cx} cy={cy} r={strokeWidth * 0.45} fill="#0f172a"/>
      <circle cx={cx} cy={cy} r={strokeWidth * 0.20} fill="white"/>
    </svg>
  );
}
