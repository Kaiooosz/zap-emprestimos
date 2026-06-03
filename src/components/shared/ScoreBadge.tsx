import { getFaixa } from "@/lib/score/calcularScore";

export function ScoreBadge({ score }: { score: number }) {
  const { label, color } = getFaixa(score);
  const pct = (score / 1000) * 100;

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-slate-700 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold tabular-nums" style={{ color }}>{score}</span>
      <span className="text-xs" style={{ color }}>{label}</span>
    </div>
  );
}
