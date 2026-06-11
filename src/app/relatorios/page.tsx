import { BarChart3, TrendingUp, DollarSign, Users, CalendarDays, AlertCircle, CheckCircle2, Clock, Presentation } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatarMoeda, formatarData } from "@/lib/utils";
import { PainelAnalitico } from "@/components/relatorios/PainelAnalitico";

export const dynamic = "force-dynamic";

export default async function RelatoriosPage() {
  const hoje = new Date();
  const mesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const em7dias = new Date(hoje.getTime() + 7 * 86_400_000);

  const [clientes, emprestimosRaw, parcelasRaw, equipe, despesasRaw] = await Promise.all([
    prisma.cliente.findMany({ orderBy: { score: "desc" } }),
    prisma.emprestimo.findMany({ include: { parcelas: true } }),
    prisma.parcela.findMany({
      include: {
        emprestimo: {
          include: {
            cliente: { select: { id: true, nome: true } },
            operador: { select: { id: true, nome: true } }
          }
        }
      }
    }),
    prisma.user.findMany({ select: { id: true, nome: true } }),
    prisma.contaPagar.findMany(),
  ]);

  // Adaptador para manter compatibilidade com cálculos antigos
  const parcelas = parcelasRaw;

  // ─── KPIs principais ──────────────────────────────────────────────────────
  const emprestimos = emprestimosRaw.map((e) => ({
    ...e,
    valorPrincipal: Number(e.valorPrincipal),
    totalJuros:     Number(e.totalJuros),
    valorTotal:     Number(e.valorTotal),
  }));

  // Capital na rua = soma dos valorDevido das parcelas em aberto de contratos ativos
  const capitalNaRua = parcelas
    .filter((p) => ["PENDENTE", "ATRASADO", "PARCIAL"].includes(p.status))
    .reduce((s, p) => s + Number(p.valorDevido), 0);

  // Lucro projetado = soma dos valorJuros de parcelas ainda pendentes
  const lucroProjetado = parcelas
    .filter((p) => ["PENDENTE", "PARCIAL"].includes(p.status))
    .reduce((s, p) => s + Number(p.valorJuros), 0);

  // Recebido no mês atual
  const recebidoMes = parcelas
    .filter((p) => p.status === "PAGO" && p.dataPagamento && new Date(p.dataPagamento) >= mesAtual)
    .reduce((s, p) => s + Number(p.valorPago ?? 0), 0);

  // Despesas no mês atual
  const despesasMes = despesasRaw
    .filter((d) => {
      const dataRef = d.dataPagamento ? new Date(d.dataPagamento) : new Date(d.dataVencimento);
      return dataRef >= mesAtual;
    })
    .reduce((s, d) => s + Number(d.valor), 0);

  // Lucro bruto no mês atual (juros pagos pelas parcelas no período)
  const lucroBrutoMes = parcelas
    .filter((p) => p.status === "PAGO" && p.dataPagamento && new Date(p.dataPagamento) >= mesAtual)
    .reduce((s, p) => s + Number(p.valorJuros), 0);

  const lucroLiquidoMes = lucroBrutoMes - despesasMes;

  // Adimplência = parcelas pagas / total de parcelas já vencidas
  const parcelasVencidas = parcelas.filter((p) => new Date(p.dataVencimento) <= hoje);
  const parcelasPagas    = parcelasVencidas.filter((p) => p.status === "PAGO").length;
  const taxaAdimplencia  = parcelasVencidas.length > 0
    ? Math.round((parcelasPagas / parcelasVencidas.length) * 100)
    : 100;

  // ─── Status dos contratos ─────────────────────────────────────────────────
  const porStatus = {
    ATIVO:        emprestimos.filter((e) => e.status === "ATIVO").length,
    QUITADO:      emprestimos.filter((e) => e.status === "QUITADO").length,
    INADIMPLENTE: emprestimos.filter((e) => e.status === "INADIMPLENTE").length,
    CANCELADO:    emprestimos.filter((e) => e.status === "CANCELADO").length,
  };
  const totalContratos = emprestimos.length;

  // ─── Agenda: próximos 7 dias ──────────────────────────────────────────────
  const agenda = parcelas
    .filter((p) => p.status === "PENDENTE" && new Date(p.dataVencimento) >= hoje && new Date(p.dataVencimento) <= em7dias)
    .sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime())
    .slice(0, 10)
    .map((p) => ({
      id:             p.id,
      dataVencimento: p.dataVencimento.toISOString(),
      valorDevido:    Number(p.valorDevido),
      valorJuros:     Number(p.valorJuros),
    }));

  // ─── Projeção mensal (próximos 3 meses) ───────────────────────────────────
  const projecao = [0, 1, 2].map((offset) => {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() + offset, 1);
    const fim    = new Date(hoje.getFullYear(), hoje.getMonth() + offset + 1, 0, 23, 59, 59);
    const parcsDoMes = parcelas.filter((p) => {
      const venc = new Date(p.dataVencimento);
      return ["PENDENTE", "PARCIAL"].includes(p.status) && venc >= inicio && venc <= fim;
    });
    return {
      mes:       inicio.toLocaleString("pt-BR", { month: "long", year: "numeric" }),
      principal: parcsDoMes.reduce((s, p) => s + Number(p.valorPrincipal), 0),
      juros:     parcsDoMes.reduce((s, p) => s + Number(p.valorJuros), 0),
      total:     parcsDoMes.reduce((s, p) => s + Number(p.valorDevido), 0),
      qtd:       parcsDoMes.length,
    };
  });

  // ─── Parcelas em atraso ───────────────────────────────────────────────────
  const atrasadas = parcelas
    .filter((p) => p.status === "ATRASADO" || (p.status === "PENDENTE" && new Date(p.dataVencimento) < hoje))
    .length;

  return (
    <div className="space-y-6">
      {/* Header da Página */}
      <div className="flex items-center gap-2">
        <BarChart3 size={20} className="text-blue-700" />
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight">Relatórios & BI</h1>
          <p className="text-xs text-slate-400 mt-0.5">Visão consolidada e painel analítico interativo</p>
        </div>
      </div>

      {/* Seção principal: Painel Analítico Interativo (Power BI de Recebimentos) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-100 pb-3">
          <Presentation size={18} className="text-blue-700" />
          <h2 className="text-sm">Power BI — Análise do Histórico de Recebimentos</h2>
        </div>
        <PainelAnalitico parcelasRaw={parcelasRaw as any} equipe={equipe} />
      </div>

      <hr className="border-slate-200" />

      {/* KPIs Gerais (Mês Atual) */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Métricas Gerais Consolidadas</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <KPI label="Capital na Rua"     value={formatarMoeda(capitalNaRua)}   icon={DollarSign}  accent />
          <KPI label="Recebido no Mês"    value={formatarMoeda(recebidoMes)}    icon={CheckCircle2} />
          <KPI label="Despesas no Mês"    value={formatarMoeda(despesasMes)}    icon={AlertCircle} negative />
          <KPI label="Lucro Líquido"      value={formatarMoeda(lucroLiquidoMes)} icon={TrendingUp} positive={lucroLiquidoMes > 0} negative={lucroLiquidoMes < 0} />
          <KPI label="Adimplência"        value={`${taxaAdimplencia}%`}         icon={Users} positive={taxaAdimplencia >= 80} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Status dos contratos */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Status dos Contratos</h2>
          <div className="space-y-3">
            <BarRow label="Ativos"       value={porStatus.ATIVO}        total={totalContratos} color="bg-blue-500" />
            <BarRow label="Quitados"     value={porStatus.QUITADO}      total={totalContratos} color="bg-emerald-500" />
            <BarRow label="Inadimplentes"value={porStatus.INADIMPLENTE} total={totalContratos} color="bg-red-500" />
            <BarRow label="Cancelados"   value={porStatus.CANCELADO}    total={totalContratos} color="bg-slate-400" />
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Total de contratos</span>
            <span className="font-bold text-slate-900">{totalContratos}</span>
          </div>
        </div>

        {/* Adimplência visual */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Adimplência Geral</h2>
          <div className="flex items-center justify-center py-2">
            <div className="relative h-28 w-28">
              <svg viewBox="0 0 36 36" className="h-28 w-28 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke={taxaAdimplencia >= 80 ? "#22c55e" : taxaAdimplencia >= 60 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="3"
                  strokeDasharray={`${taxaAdimplencia} ${100 - taxaAdimplencia}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-2xl font-bold text-blue-700">{taxaAdimplencia}%</p>
                <p className="text-[10px] text-slate-500">adimplente</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-2 text-center">
              <p className="text-lg font-bold text-emerald-600">{parcelasPagas}</p>
              <p className="text-[10px] text-slate-500">Pagas</p>
            </div>
            <div className="rounded-lg bg-red-50 border border-red-100 p-2 text-center">
              <p className="text-lg font-bold text-red-500">{atrasadas}</p>
              <p className="text-[10px] text-slate-500">Atrasadas</p>
            </div>
          </div>
        </div>

        {/* Ranking de clientes */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Ranking de Clientes</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {clientes.slice(0, 6).map((c, i) => {
              const scoreColor =
                c.score >= 851 ? "text-emerald-500" :
                c.score >= 701 ? "text-blue-500" :
                c.score >= 501 ? "text-amber-500" :
                c.score >= 301 ? "text-orange-500" :
                "text-red-500";
              return (
                <div key={c.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                  <span className="text-xs font-bold text-slate-400 w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{c.nome}</p>
                  </div>
                  <span className={`text-sm font-bold tabular-nums ${scoreColor}`}>{c.score}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Projeção de recebimentos — próximos 3 meses */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <TrendingUp size={16} className="text-blue-700" />
          <h2 className="text-sm font-semibold text-slate-900">Projeção de Recebimentos</h2>
          <span className="text-xs text-slate-400 ml-1">— próximos 3 meses (parcelas pendentes)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {["Período", "Parcelas", "Principal Esperado", "Juros Esperados", "Total Esperado"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {projecao.map((m) => (
                <tr key={m.mes} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-slate-900 capitalize">{m.mes}</td>
                  <td className="px-5 py-3.5 text-slate-500">{m.qtd} parcelas</td>
                  <td className="px-5 py-3.5 text-slate-700 tabular-nums">{formatarMoeda(m.principal)}</td>
                  <td className="px-5 py-3.5 text-blue-700 font-semibold tabular-nums">{formatarMoeda(m.juros)}</td>
                  <td className="px-5 py-3.5 font-bold text-slate-900 tabular-nums">{formatarMoeda(m.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr>
                <td colSpan={2} className="px-5 py-3 text-xs font-semibold text-slate-500">Total projetado (3 meses)</td>
                <td className="px-5 py-3 text-sm font-bold text-slate-900 tabular-nums">{formatarMoeda(projecao.reduce((s, m) => s + m.principal, 0))}</td>
                <td className="px-5 py-3 text-sm font-bold text-blue-700 tabular-nums">{formatarMoeda(projecao.reduce((s, m) => s + m.juros, 0))}</td>
                <td className="px-5 py-3 text-sm font-bold text-slate-900 tabular-nums">{formatarMoeda(projecao.reduce((s, m) => s + m.total, 0))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Agenda: próximos 7 dias */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <CalendarDays size={16} className="text-blue-700" />
          <h2 className="text-sm font-semibold text-slate-900">Agenda — Próximos 7 Dias</h2>
          <span className="ml-auto text-xs text-slate-400">{agenda.length} vencimentos</span>
        </div>
        {agenda.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">Nenhum vencimento nos próximos 7 dias.</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {agenda.map((item) => {
              const venc     = new Date(item.dataVencimento);
              const isHoje   = venc.toDateString() === hoje.toDateString();
              const diasAte  = Math.ceil((venc.getTime() - hoje.getTime()) / 86_400_000);
              return (
                <div key={item.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className={`flex flex-col items-center justify-center h-10 w-10 rounded-xl shrink-0 ${isHoje ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-700"}`}>
                    <span className="text-xs font-bold leading-none">{venc.getDate()}</span>
                    <span className="text-[9px] leading-none mt-0.5 opacity-70">{venc.toLocaleString("pt-BR", { month: "short" })}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 tabular-nums">{formatarMoeda(item.valorDevido)}</p>
                    <p className="text-xs text-slate-400">
                      {isHoje ? "Vence hoje" : `Em ${diasAte} dia${diasAte > 1 ? "s" : ""}`}
                      {" · "}Juros: {formatarMoeda(item.valorJuros)}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${isHoje ? "bg-blue-50 text-blue-700" : "bg-slate-50 text-slate-500"}`}>
                    {isHoje ? <AlertCircle size={10} /> : <Clock size={10} />}
                    {isHoje ? "Hoje" : formatarData(item.dataVencimento)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function KPI({ label, value, icon: Icon, accent, positive, negative }: {
  label: string; value: string; icon: any; accent?: boolean; positive?: boolean; negative?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
        <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${accent ? "bg-blue-50 text-blue-700" : positive ? "bg-emerald-50 text-emerald-600" : negative ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-400"}`}>
          <Icon size={13} />
        </div>
      </div>
      <p className={`text-lg font-bold ${accent ? "text-blue-700" : negative ? "text-red-600" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}

function BarRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-slate-500">{label}</span>
        <span className="font-semibold text-slate-900">{value} <span className="text-slate-400 font-normal">({Math.round(pct)}%)</span></span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
