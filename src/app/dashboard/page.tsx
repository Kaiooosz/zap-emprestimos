import { Suspense } from "react";
import { DollarSign, TrendingUp, AlertTriangle, Banknote, Calendar, ChevronRight, ArrowUpRight, ArrowDownRight } from "lucide-react";
import Link from "next/link";
import { store } from "@/lib/store";
import { formatarMoeda, formatarData } from "@/lib/utils";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { GraficoBarras } from "@/components/dashboard/GraficoBarras";
import { MiniCalendario } from "@/components/dashboard/MiniCalendario";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const data     = store.dashboard.get();
  const clientes = store.clientes.list();
  const emps     = store.emprestimos.list();
  const parcelas = store.parcelas.list();

  const carteira = {
    ativo:    parcelas.filter((p) => p.status === "PENDENTE").reduce((s, p) => s + p.valorDevido, 0),
    atrasado: parcelas.filter((p) => p.status === "ATRASADO").reduce((s, p) => s + p.valorDevido, 0),
    parcial:  parcelas.filter((p) => p.status === "PARCIAL").reduce((s, p) => s + p.valorDevido, 0),
  };
  const totalCarteira = carteira.ativo + carteira.atrasado + carteira.parcial;

  const topClientes = clientes
    .map((c) => {
      const saldo = emps
        .filter((e) => e.clienteId === c.id && e.status === "ATIVO")
        .flatMap((e) => parcelas.filter((p) => p.emprestimoId === e.id && ["PENDENTE","ATRASADO"].includes(p.status)))
        .reduce((s, p) => s + p.valorDevido, 0);
      return { ...c, saldo };
    })
    .filter((c) => c.saldo > 0)
    .sort((a, b) => b.saldo - a.saldo)
    .slice(0, 6);
  const maxSaldo = topClientes[0]?.saldo ?? 1;

  const recentes = parcelas
    .filter((p) => p.status === "PAGO" && p.dataPagamento)
    .sort((a, b) => new Date(b.dataPagamento!).getTime() - new Date(a.dataPagamento!).getTime())
    .slice(0, 8)
    .map((p) => {
      const e = emps.find((e) => e.id === p.emprestimoId);
      const c = clientes.find((c) => c.id === e?.clienteId);
      return { ...p, clienteNome: c?.nome ?? "—" };
    });

  const hoje = new Date();
  const em7dias = new Date(hoje); em7dias.setDate(hoje.getDate() + 7);
  const proxVenc = parcelas
    .filter((p) => { const v = new Date(p.dataVencimento); return v >= hoje && v <= em7dias && ["PENDENTE","ATRASADO"].includes(p.status); })
    .sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime())
    .slice(0, 5)
    .map((p) => {
      const e = emps.find((e) => e.id === p.emprestimoId);
      const c = clientes.find((c) => c.id === e?.clienteId);
      return { ...p, clienteNome: c?.nome ?? "—" };
    });

  const adimplencia = parcelas.length > 0 ? Math.round((parcelas.filter((p) => p.status === "PAGO").length / parcelas.length) * 100) : 0;

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight">Visao Geral</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {hoje.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Suspense fallback={null}>
          <DashboardFilters />
        </Suspense>
      </div>

      {/* KPIs — 4 cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Capital na Rua",     value: formatarMoeda(data.capitalNaRua),  sub: `${data.totalClientesAtivos} contratos ativos`, icon: DollarSign,    trend: null,     up: true },
          { label: "Recebido este Mes",  value: formatarMoeda(data.recebidoMes),  sub: "Pagamentos do periodo",                          icon: Banknote,      trend: "+12%",   up: true },
          { label: "Lucro do Mes",       value: formatarMoeda(data.lucroMes),     sub: "Juros cobrados no periodo",                       icon: TrendingUp,    trend: "+8%",    up: true },
          { label: "Parcelas Atrasadas", value: String(data.parcelasAtrasadas),   sub: formatarMoeda(carteira.atrasado) + " em aberto",   icon: AlertTriangle, trend: data.parcelasAtrasadas > 0 ? String(data.parcelasAtrasadas) : null, up: false },
        ].map(({ label, value, sub, icon: Icon, trend, up }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider leading-tight">{label}</p>
              <div className="h-7 w-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                <Icon size={13} className="text-slate-400" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 leading-none tabular-nums">{value}</p>
            <div className="flex items-center justify-between mt-2.5">
              <p className="text-xs text-slate-400 leading-tight">{sub}</p>
              {trend && (
                <span className={`flex items-center gap-0.5 text-xs font-bold ${up ? "text-emerald-600" : "text-red-500"}`}>
                  {up ? <ArrowUpRight size={10}/> : <ArrowDownRight size={10}/>}{trend}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Linha 2 — 3+2 colunas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Histórico + Vencimentos */}
        <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Historico de Recebimentos</p>
              <p className="text-base font-bold text-slate-900 mt-0.5">Ultimos 6 meses de atividade</p>
            </div>
            <Link href="/relatorios" className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 transition-colors shrink-0 mt-1">
              Ver relatorio <ChevronRight size={11}/>
            </Link>
          </div>
          <div className="px-5 pt-4 pb-5">
            <GraficoBarras dados={data.evolucaoMensal} />
          </div>

          {/* Proximos vencimentos */}
          <div className="border-t border-slate-100">
            <div className="px-5 pt-4 pb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Proximos Vencimentos</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{formatarMoeda(data.totalSemana)} nos proximos 7 dias</p>
              </div>
              <Link href="/calendario" className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700">
                <Calendar size={11}/> Calendario
              </Link>
            </div>
            <div className="divide-y divide-slate-50">
              {proxVenc.map((p) => {
                const diasAte = Math.max(0, Math.floor((new Date(p.dataVencimento).getTime() - hoje.getTime()) / 86400000));
                return (
                  <div key={p.id} className="flex items-center gap-3 px-5 py-2.5">
                    <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${p.status === "ATRASADO" ? "bg-red-400" : diasAte === 0 ? "bg-amber-400" : "bg-slate-300"}`} />
                    <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">{p.clienteNome}</span>
                    <span className="text-xs text-slate-400 hidden sm:block shrink-0">Parc. {p.numero}</span>
                    <span className="text-sm font-bold text-slate-900 shrink-0">{formatarMoeda(p.valorDevido)}</span>
                    <span className="text-xs text-slate-400 w-16 text-right shrink-0">
                      {diasAte === 0 ? "Hoje" : diasAte === 1 ? "Amanha" : `${diasAte}d`}
                    </span>
                  </div>
                );
              })}
              {proxVenc.length === 0 && <p className="px-5 py-4 text-sm text-slate-400">Sem vencimentos nos proximos 7 dias</p>}
            </div>
          </div>
        </div>

        {/* Carteira + Top Clientes */}
        <div className="lg:col-span-2 space-y-4">
          {/* Composicao da carteira */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Saldo da Carteira</p>
            <p className="text-2xl font-black text-slate-900 mb-1 tabular-nums">{formatarMoeda(totalCarteira)}</p>
            <p className="text-xs text-slate-400 mb-4">Total de recebimentos em aberto</p>

            <div className="space-y-3">
              {[
                { label: "Pendente (em dia)", valor: carteira.ativo,    cor: "bg-blue-600" },
                { label: "Em atraso",          valor: carteira.atrasado, cor: "bg-red-400" },
                { label: "Parcial (so juros)", valor: carteira.parcial,  cor: "bg-amber-400" },
              ].map(({ label, valor, cor }) => {
                const pct = totalCarteira > 0 ? (valor / totalCarteira) * 100 : 0;
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-500">{label}</span>
                      <span className="font-semibold text-slate-700 tabular-nums">{formatarMoeda(valor)}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${cor}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-slate-100 mt-4 pt-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-400">Adimplencia</p>
                <p className="text-lg font-black text-slate-900 mt-0.5">{adimplencia}%</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Clientes ativos</p>
                <p className="text-lg font-black text-slate-900 mt-0.5">{data.totalClientesAtivos}</p>
              </div>
            </div>
          </div>

          {/* Top clientes */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Maiores Saldos</p>
            </div>
            <div className="divide-y divide-slate-50">
              {topClientes.map((c, i) => (
                <Link key={c.id} href={`/clientes/${c.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group">
                  <span className="text-xs font-bold text-slate-200 w-4 shrink-0 tabular-nums">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-700 transition-colors">{c.nome}</p>
                    <div className="h-1 w-full rounded-full bg-slate-100 mt-1.5 overflow-hidden">
                      <div className="h-full rounded-full bg-slate-400" style={{ width: `${(c.saldo / maxSaldo) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-900 shrink-0 tabular-nums">{formatarMoeda(c.saldo)}</span>
                </Link>
              ))}
              {topClientes.length === 0 && <p className="px-5 py-6 text-sm text-slate-400 text-center">Nenhum saldo ativo</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Linha 3 — Pagamentos recentes + Mini calendário */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pagamentos Recentes</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">Sua ultima atividade financeira</p>
            </div>
            <Link href="/atividades" className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700">
              Ver todos <ChevronRight size={11}/>
            </Link>
          </div>
          {recentes.length === 0 ? (
            <p className="px-5 py-10 text-sm text-slate-400 text-center">Nenhum pagamento registrado</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentes.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-slate-500">{p.clienteNome[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{p.clienteNome}</p>
                    <p className="text-xs text-slate-400">
                      Parcela {p.numero}
                      {p.modoPagamento === "SOMENTE_JUROS" && " · somente juros"}
                      {p.modoPagamento === "QUITACAO_TOTAL" && " · quitacao total"}
                      {" · "}{p.dataPagamento ? new Date(p.dataPagamento).toLocaleDateString("pt-BR") : "—"}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-emerald-700 shrink-0 tabular-nums">
                    +{formatarMoeda(p.valorPago ?? p.valorDevido)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <MiniCalendario parcelas={parcelas} />
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Resumo</p>
            {[
              { label: "A receber esta semana", value: formatarMoeda(data.totalSemana) },
              { label: "Clientes ativos",       value: String(data.totalClientesAtivos) },
              { label: "Adimplencia",           value: `${adimplencia}%` },
              { label: "Contratos ativos",      value: String(emps.filter((e) => e.status === "ATIVO").length) },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <span className="text-xs text-slate-500">{label}</span>
                <span className="text-sm font-bold text-slate-900 tabular-nums">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
