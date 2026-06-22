import { Suspense } from "react";
import { DollarSign, TrendingUp, AlertTriangle, Banknote, Calendar, ChevronRight, ArrowUpRight, ArrowDownRight } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatarMoeda, formatarData } from "@/lib/utils";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { GraficoBarras } from "@/components/dashboard/GraficoBarras";
import { MiniCalendario } from "@/components/dashboard/MiniCalendario";
import { OnboardingTour } from "@/components/shared/OnboardingTour";
import { decryptCliente } from "@/lib/crypto";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    periodo?: string;
    status?: string;
    new?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const periodo = resolvedParams.periodo ?? "mes";
  const status = resolvedParams.status ?? "todos";
  const isNew = resolvedParams.new === "true";

  const hoje    = new Date();
  const em7dias = new Date(hoje); em7dias.setDate(hoje.getDate() + 7);

  const [parcelasRaw, empsRaw, clientesRaw, despesasRaw] = await Promise.all([
    prisma.parcela.findMany({ include: { emprestimo: { include: { cliente: { select: { id: true, nome: true } } } } } }),
    prisma.emprestimo.findMany({ include: { parcelas: { select: { status: true, valorDevido: true, dataVencimento: true, valorJuros: true } } } }),
    prisma.cliente.findMany({ orderBy: { score: "desc" } }),
    prisma.contaPagar.findMany(),
  ]);
  const clientes = clientesRaw.map(decryptCliente);

  const toN = (v: any) => Number(v);

  // Status mapping
  const statusMap: Record<string, string> = {
    ativo: "ATIVO",
    inadimplente: "INADIMPLENTE",
    quitado: "QUITADO",
  };
  const statusFiltro = statusMap[status];

  // Aplicar filtro de status
  const parcelas = statusFiltro 
    ? parcelasRaw.filter((p) => p.emprestimo.status === statusFiltro)
    : parcelasRaw;

  const emps = statusFiltro
    ? empsRaw.filter((e) => e.status === statusFiltro)
    : empsRaw;

  // Datas de filtro baseadas no período
  let dataInicioFiltro = new Date(hoje.getFullYear(), hoje.getMonth(), 1); // default mes
  let dataFimFiltro = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);

  if (periodo === "hoje") {
    dataInicioFiltro = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0);
    dataFimFiltro = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);
  } else if (periodo === "semana") {
    dataInicioFiltro = new Date(hoje);
    dataInicioFiltro.setDate(hoje.getDate() - 7);
    dataInicioFiltro.setHours(0, 0, 0, 0);
    dataFimFiltro = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);
  } else if (periodo === "ano") {
    dataInicioFiltro = new Date(hoje.getFullYear(), 0, 1, 0, 0, 0);
    dataFimFiltro = new Date(hoje.getFullYear(), 11, 31, 23, 59, 59);
  }

  const carteira = {
    ativo:    parcelas.filter((p) => p.status === "PENDENTE").reduce((s, p) => s + toN(p.valorDevido), 0),
    atrasado: parcelas.filter((p) => p.status === "ATRASADO").reduce((s, p) => s + toN(p.valorDevido), 0),
    parcial:  parcelas.filter((p) => p.status === "PARCIAL").reduce((s, p) => s + toN(p.valorDevido), 0),
  };
  const totalCarteira = carteira.ativo + carteira.atrasado + carteira.parcial;

  const capitalNaRua = emps.filter((e) => e.status === "ATIVO")
    .flatMap((e) => e.parcelas.filter((p) => ["PENDENTE","ATRASADO"].includes(p.status)))
    .reduce((s, p) => s + toN(p.valorDevido), 0);

  const recebidoPeriodo = parcelas
    .filter((p) => p.status === "PAGO" && p.dataPagamento && new Date(p.dataPagamento) >= dataInicioFiltro && new Date(p.dataPagamento) <= dataFimFiltro)
    .reduce((s, p) => s + toN(p.valorPago ?? 0), 0);

  const lucroPeriodo = parcelas
    .filter((p) => p.status === "PAGO" && p.dataPagamento && new Date(p.dataPagamento) >= dataInicioFiltro && new Date(p.dataPagamento) <= dataFimFiltro)
    .reduce((s, p) => s + toN(p.valorJuros), 0);

  const despesasNoPeriodo = despesasRaw.filter((d) => {
    const dataRef = d.dataPagamento ? new Date(d.dataPagamento) : new Date(d.dataVencimento);
    return dataRef >= dataInicioFiltro && dataRef <= dataFimFiltro;
  });
  const totalDespesas = despesasNoPeriodo.reduce((s, d) => s + toN(d.valor), 0);
  const lucroLiquido = lucroPeriodo - totalDespesas;

  const parcelasAtrasadas = parcelas.filter((p) =>
    p.status === "ATRASADO" || (["PENDENTE","PARCIAL"].includes(p.status) && new Date(p.dataVencimento) < hoje)
  );

  const totalSemana = parcelas
    .filter((p) => ["PENDENTE","ATRASADO"].includes(p.status) && new Date(p.dataVencimento) >= hoje && new Date(p.dataVencimento) <= em7dias)
    .reduce((s, p) => s + toN(p.valorDevido), 0);

  const topClientes = clientes.map((c) => {
    const saldo = emps
      .filter((e) => e.clienteId === c.id && e.status === "ATIVO")
      .flatMap((e) => e.parcelas.filter((p) => ["PENDENTE","ATRASADO"].includes(p.status)))
      .reduce((s, p) => s + toN(p.valorDevido), 0);
    return { ...c, saldo };
  }).filter((c) => c.saldo > 0).sort((a, b) => b.saldo - a.saldo).slice(0, 6);
  const maxSaldo = topClientes[0]?.saldo ?? 1;

  const recentes = parcelas
    .filter((p) => p.status === "PAGO" && p.dataPagamento)
    .sort((a, b) => new Date(b.dataPagamento!).getTime() - new Date(a.dataPagamento!).getTime())
    .slice(0, 8)
    .map((p) => ({ ...p, valorDevido: toN(p.valorDevido), valorPago: p.valorPago ? toN(p.valorPago) : undefined, clienteNome: p.emprestimo.cliente?.nome ?? "—" }));

  const proxVenc = parcelas
    .filter((p) => { const v = new Date(p.dataVencimento); return v >= hoje && v <= em7dias && ["PENDENTE","ATRASADO"].includes(p.status); })
    .sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime())
    .slice(0, 5)
    .map((p) => ({ ...p, valorDevido: toN(p.valorDevido), clienteNome: p.emprestimo.cliente?.nome ?? "—" }));

  const parcelasVencidas = parcelas.filter((p) => new Date(p.dataVencimento) <= hoje);
  const parcelasPagasCount = parcelasVencidas.filter((p) => p.status === "PAGO").length;
  const adimplencia = parcelasVencidas.length > 0
    ? Math.round((parcelasPagasCount / parcelasVencidas.length) * 100)
    : 100;

  // ─── Período Anterior para Variação Percentual ───
  const diffTime = Math.abs(dataFimFiltro.getTime() - dataInicioFiltro.getTime());
  const dataInicioAnterior = new Date(dataInicioFiltro.getTime() - diffTime - 1000);
  const dataFimAnterior = new Date(dataFimFiltro.getTime() - diffTime - 1000);

  const capitalNaRuaAnterior = empsRaw
    .filter((e) => e.status === "ATIVO")
    .flatMap((e) => e.parcelas.filter((p) => ["PENDENTE","ATRASADO"].includes(p.status) && new Date(p.dataVencimento) <= dataFimAnterior))
    .reduce((s, p) => s + toN(p.valorDevido), 0);

  const recebidoPeriodoAnterior = parcelas
    .filter((p) => p.status === "PAGO" && p.dataPagamento && new Date(p.dataPagamento) >= dataInicioAnterior && new Date(p.dataPagamento) <= dataFimAnterior)
    .reduce((s, p) => s + toN(p.valorPago ?? 0), 0);

  const lucroPeriodoAnterior = parcelas
    .filter((p) => p.status === "PAGO" && p.dataPagamento && new Date(p.dataPagamento) >= dataInicioAnterior && new Date(p.dataPagamento) <= dataFimAnterior)
    .reduce((s, p) => s + toN(p.valorJuros), 0);

  const despesasNoPeriodoAnterior = despesasRaw.filter((d) => {
    const dataRef = d.dataPagamento ? new Date(d.dataPagamento) : new Date(d.dataVencimento);
    return dataRef >= dataInicioAnterior && dataRef <= dataFimAnterior;
  });
  const totalDespesasAnterior = despesasNoPeriodoAnterior.reduce((s, d) => s + toN(d.valor), 0);
  const lucroLiquidoAnterior = lucroPeriodoAnterior - totalDespesasAnterior;

  const parcelasAtrasadasAnterior = parcelas.filter((p) => {
    const venc = new Date(p.dataVencimento);
    return venc <= dataFimAnterior && (p.status === "ATRASADO" || (["PENDENTE","PARCIAL"].includes(p.status) && venc < new Date(dataFimAnterior)));
  }).length;

  const calcularCrescimento = (atual: number, anterior: number) => {
    if (anterior <= 0) return atual > 0 ? "+100%" : "0%";
    const diff = ((atual - anterior) / anterior) * 100;
    const sinal = diff >= 0 ? "+" : "";
    return `${sinal}${Math.round(diff)}%`;
  };

  const trendNaRua = calcularCrescimento(capitalNaRua, capitalNaRuaAnterior);
  const trendRecebido = calcularCrescimento(recebidoPeriodo, recebidoPeriodoAnterior);
  const trendLucro = calcularCrescimento(lucroLiquido, lucroLiquidoAnterior);
  const trendAtrasadas = calcularCrescimento(parcelasAtrasadas.length, parcelasAtrasadasAnterior);

  // Ontem Real
  const ontemInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1, 0, 0, 0);
  const ontemFim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1, 23, 59, 59);
  const recebidoOntem = parcelas
    .filter((p) => p.status === "PAGO" && p.dataPagamento && new Date(p.dataPagamento) >= ontemInicio && new Date(p.dataPagamento) <= ontemFim)
    .reduce((s, p) => s + toN(p.valorPago ?? 0), 0);

  // Lucro previsto real de juros pendentes
  const lucroPrevistoReal = emps
    .filter((e) => e.status === "ATIVO")
    .flatMap((e) => e.parcelas.filter((p) => ["PENDENTE", "PARCIAL", "ATRASADO"].includes(p.status)))
    .reduce((s, p) => s + toN(p.valorJuros), 0);

  // Evolução com agrupamento temporal dinâmico
  let evolucaoMensal: Array<{ mes: string; recebido: number }> = [];

  if (periodo === "semana" || periodo === "hoje") {
    // Últimos 7 dias
    evolucaoMensal = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() - (6 - i));
      const inicioDia = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const fimDia = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
      const rec = parcelas
        .filter((p) => p.status === "PAGO" && p.dataPagamento && new Date(p.dataPagamento) >= inicioDia && new Date(p.dataPagamento) <= fimDia)
        .reduce((s, p) => s + toN(p.valorPago ?? 0), 0);
      return {
        mes: d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }),
        recebido: rec,
      };
    });
  } else if (periodo === "ano") {
    // Meses do ano corrente
    evolucaoMensal = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(hoje.getFullYear(), i, 1);
      const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const rec = parcelas
        .filter((p) => p.status === "PAGO" && p.dataPagamento && new Date(p.dataPagamento) >= d && new Date(p.dataPagamento) <= fim)
        .reduce((s, p) => s + toN(p.valorPago ?? 0), 0);
      return {
        mes: d.toLocaleString("pt-BR", { month: "short" }),
        recebido: rec,
      };
    });
  } else {
    // Padrão: Últimos 6 meses
    evolucaoMensal = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - (5 - i), 1);
      const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const rec = parcelas
        .filter((p) => p.status === "PAGO" && p.dataPagamento && new Date(p.dataPagamento) >= d && new Date(p.dataPagamento) <= fim)
        .reduce((s, p) => s + toN(p.valorPago ?? 0), 0);
      return {
        mes: d.toLocaleString("pt-BR", { month: "short" }),
        recebido: rec,
      };
    });
  }

  // Título dinâmico do histórico
  const tituloEvolucao = 
    periodo === "semana" || periodo === "hoje" ? "Últimos 7 dias" :
    periodo === "ano" ? "Meses do ano" : "Últimos 6 meses";

  const data = {
    capitalNaRua,
    recebidoMes: recebidoPeriodo,
    lucroMes: lucroPeriodo,
    lucroLiquido,
    totalDespesas,
    parcelasAtrasadas: parcelasAtrasadas.length,
    totalSemana,
    totalClientesAtivos: emps.filter((e) => e.status === "ATIVO").length,
    evolucaoMensal,
    projecoes: {
      lucroPrevisto:          lucroPrevistoReal,
      capitalEmRisco:         carteira.atrasado,
      recebidoOntem,
      mediaRecebimentoDiario: recebidoPeriodo / Math.max(1, hoje.getDate()),
    },
  };

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
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          { label: "Na Rua",      value: formatarMoeda(data.capitalNaRua),   sub: `${data.totalClientesAtivos} ativos`,   icon: DollarSign,    trend: trendNaRua,     up: !trendNaRua.startsWith("-"), href: "/emprestimos" },
          { label: "Recebido",    value: formatarMoeda(data.recebidoMes),   sub: "Este período",                          icon: Banknote,      trend: trendRecebido,   up: !trendRecebido.startsWith("-"), href: "/relatorios" },
          { label: "Lucro Líquido", value: formatarMoeda(data.lucroLiquido), sub: `Bruto: ${formatarMoeda(data.lucroMes)} | Despesas: ${formatarMoeda(data.totalDespesas)}`, icon: TrendingUp, trend: trendLucro, up: !trendLucro.startsWith("-"), href: "/relatorios" },
          { label: "Atrasadas",   value: String(data.parcelasAtrasadas),    sub: formatarMoeda(carteira.atrasado),        icon: AlertTriangle, trend: data.parcelasAtrasadas > 0 ? trendAtrasadas : null, up: trendAtrasadas.startsWith("-"), href: "/cobrancas" },
        ].map(({ label, value, sub, icon: Icon, trend, up, href }) => {
          const content = (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
                <div className="h-6 w-6 rounded-md bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                  <Icon size={11} className="text-slate-400" />
                </div>
              </div>
              <p className="text-base sm:text-xl font-black text-slate-900 leading-none tabular-nums">{value}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-[10px] text-slate-400 leading-tight truncate">{sub}</p>
                {trend && (
                  <span className={`flex items-center gap-0.5 text-[10px] font-bold shrink-0 ${up ? "text-emerald-600" : "text-red-500"}`}>
                    {up ? <ArrowUpRight size={9}/> : <ArrowDownRight size={9}/>}{trend}
                  </span>
                )}
              </div>
            </>
          );
          return href ? (
            <Link key={label} href={href} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:border-blue-400 hover:shadow-md transition-all cursor-pointer block group">
              {content}
            </Link>
          ) : (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              {content}
            </div>
          );
        })}
      </div>

      {/* Projecoes financeiras — 3 cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "L. Previsto",  value: formatarMoeda(data.projecoes.lucroPrevisto),          sub: "Juros futuros", href: "/relatorios" },
          { label: "Em Risco",     value: formatarMoeda(data.projecoes.capitalEmRisco),          sub: "Inadimplentes", href: "/cobrancas" },
          { label: "Ontem",        value: formatarMoeda(data.projecoes.recebidoOntem),           sub: `Med. ${formatarMoeda(data.projecoes.mediaRecebimentoDiario)}/d`, href: "/relatorios" },
        ].map(({ label, value, sub, href }) => {
          const content = (
            <>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{label}</p>
              <p className="text-sm sm:text-base font-black text-slate-900 tabular-nums">{value}</p>
              <p className="text-[10px] text-slate-400 mt-1 truncate">{sub}</p>
            </>
          );
          return href ? (
            <Link key={label} href={href} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:border-blue-400 hover:shadow-md transition-all cursor-pointer block group">
              {content}
            </Link>
          ) : (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              {content}
            </div>
          );
        })}
      </div>

      {/* Linha 2 — 3+2 colunas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Histórico + Vencimentos */}
        <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-slate-100 flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Historico de Recebimentos</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{tituloEvolucao}</p>
            </div>
            <Link href="/relatorios" className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 transition-colors shrink-0 mt-1">
              Ver relatorio <ChevronRight size={11}/>
            </Link>
          </div>
          <div className="px-4 pt-3 pb-4">
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
                  <span className="text-xs font-bold text-slate-500 w-4 shrink-0 tabular-nums">{i + 1}</span>
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
          <MiniCalendario parcelas={parcelas.map((p) => ({ ...p, valorDevido: toN(p.valorDevido), dataVencimento: p.dataVencimento.toISOString(), createdAt: p.createdAt.toISOString(), dataPagamento: p.dataPagamento?.toISOString(), valorPago: p.valorPago ? toN(p.valorPago) : undefined, valorPrincipal: toN(p.valorPrincipal ?? 0), valorJuros: toN(p.valorJuros ?? 0), desconto: p.desconto ? toN(p.desconto) : undefined, modoPagamento: p.modoPagamento ?? undefined })) as any} />
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
      <OnboardingTour startAutomatically={isNew} />
    </div>
  );
}
