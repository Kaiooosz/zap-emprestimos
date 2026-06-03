import { BarChart3, TrendingUp, TrendingDown, DollarSign, Users } from "lucide-react";
import { store } from "@/lib/store";
import { formatarMoeda } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function RelatoriosPage() {
  const data = store.dashboard.get();
  const clientes = store.clientes.list();
  const emprestimos = store.emprestimos.list();
  const parcelas = store.parcelas.list();

  const totalEmprestado = emprestimos.reduce((s, e) => s + e.valorPrincipal, 0);
  const totalJuros = emprestimos.reduce((s, e) => s + e.totalJuros, 0);
  const parcelasPagas = parcelas.filter((p) => p.status === "PAGO").length;
  const taxaAdimplencia = parcelas.length > 0 ? Math.round((parcelasPagas / parcelas.length) * 100) : 0;

  const porStatus = {
    ATIVO:        emprestimos.filter((e) => e.status === "ATIVO").length,
    QUITADO:      emprestimos.filter((e) => e.status === "QUITADO").length,
    INADIMPLENTE: emprestimos.filter((e) => e.status === "INADIMPLENTE").length,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <BarChart3 size={20} className="text-blue-700" />
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Relatorios</h1>
          <p className="text-sm text-slate-400 mt-0.5">Visao consolidada do negocio</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI label="Capital na Rua" value={formatarMoeda(data.capitalNaRua)} icon={DollarSign} accent />
        <KPI label="Lucro do Mes" value={formatarMoeda(data.lucroMes)} icon={TrendingUp} positive />
        <KPI label="Total Emprestado" value={formatarMoeda(totalEmprestado)} icon={DollarSign} />
        <KPI label="Juros Totais" value={formatarMoeda(totalJuros)} icon={TrendingUp} positive />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Status dos contratos */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Status dos Contratos</h2>
          <div className="space-y-3">
            <BarRow label="Ativos" value={porStatus.ATIVO} total={emprestimos.length} color="bg-blue-500" />
            <BarRow label="Quitados" value={porStatus.QUITADO} total={emprestimos.length} color="bg-emerald-500" />
            <BarRow label="Inadimplentes" value={porStatus.INADIMPLENTE} total={emprestimos.length} color="bg-red-500" />
          </div>
        </div>

        {/* Adimplência */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Adimplencia</h2>
          <div className="flex items-center justify-center py-4">
            <div className="relative h-28 w-28">
              <svg viewBox="0 0 36 36" className="h-28 w-28 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e3a5f" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke="#4a78c0" strokeWidth="3"
                  strokeDasharray={`${taxaAdimplencia} ${100 - taxaAdimplencia}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-2xl font-bold text-blue-700">{taxaAdimplencia}%</p>
                <p className="text-xs text-slate-400">adimplente</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="rounded-lg bg-white p-3 text-center">
              <p className="text-lg font-bold text-emerald-400">{parcelasPagas}</p>
              <p className="text-xs text-slate-400">Pagas</p>
            </div>
            <div className="rounded-lg bg-white p-3 text-center">
              <p className="text-lg font-bold text-red-400">{data.parcelasAtrasadas}</p>
              <p className="text-xs text-slate-400">Atrasadas</p>
            </div>
          </div>
        </div>

        {/* Top clientes por score */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-white">Ranking de Clientes</h2>
          </div>
          <div className="divide-y divide-[#1e3a5f]/50">
            {clientes.slice(0, 6).map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                <span className="text-xs font-bold text-slate-500 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{c.nome}</p>
                </div>
                <span className={`text-sm font-bold tabular-nums ${c.score >= 80 ? "text-emerald-400" : c.score >= 60 ? "text-blue-400" : c.score >= 40 ? "text-amber-400" : "text-red-400"}`}>
                  {c.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, icon: Icon, accent, positive }: { label: string; value: string; icon: typeof DollarSign; accent?: boolean; positive?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${accent ? "bg-[#4a78c0]/15 text-blue-700" : positive ? "bg-emerald-500/15 text-emerald-400" : "bg-[#1e3a5f] text-slate-400"}`}>
          <Icon size={14} />
        </div>
      </div>
      <p className={`text-lg font-bold ${accent ? "text-blue-700" : "text-white"}`}>{value}</p>
    </div>
  );
}

function BarRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="font-semibold text-white">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
