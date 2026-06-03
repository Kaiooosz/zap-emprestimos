import { getFaixa } from "@/lib/score/calcularScore";

export function ScoreBadge({ score }: { score: number }) {
  const { label } = getFaixa(score);
  const pct = (score / 1000) * 100;

  // Cor da barra apenas (texto sempre slate)
  const barColor =
    score >= 851 ? "bg-slate-700" :
    score >= 701 ? "bg-slate-500" :
    score >= 501 ? "bg-amber-500" :
    score >= 301 ? "bg-red-400" :
                   "bg-red-600";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-slate-200 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-700 tabular-nums">{score}</span>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}
