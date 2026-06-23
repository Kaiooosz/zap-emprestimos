"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Search, X, MessageCircle } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatarMoeda, obterMeiaNoiteBR } from "@/lib/utils";

interface ParcelaCalendario {
  id: string;
  emprestimoId: string;
  numero: number;
  valorDevido: number;
  dataVencimento: string;
  dataPagamento?: string;
  status: string;
  clienteId: string;
  clienteNome: string;
  clientePhone: string;
}

interface DespesaCalendario {
  id: string;
  descricao: string;
  valor: number;
  dataVencimento: string;
  status: string;
}

interface Props {
  parcelas: ParcelaCalendario[];
  clientes: { id: string; nome: string }[];
  despesas?: DespesaCalendario[];
}

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

export function CalendarioClient({ parcelas, clientes, despesas = [] }: Props) {
  const hoje = obterMeiaNoiteBR();
  const [ano,  setAno]        = useState(hoje.getFullYear());
  const [mes,  setMes]        = useState(hoje.getMonth());
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [statusFiltro,  setStatusFiltro]  = useState("todos");
  const [diaSelecionado, setDia]          = useState<number | null>(hoje.getDate());
  const [busca, setBusca]                 = useState("");

  // Navegar meses
  function prevMes() {
    if (mes === 0) { setMes(11); setAno(a => a - 1); }
    else           { setMes(m => m - 1); }
    setDia(null);
  }
  function nextMes() {
    if (mes === 11) { setMes(0); setAno(a => a + 1); }
    else            { setMes(m => m + 1); }
    setDia(null);
  }
  function irHoje() {
    setAno(hoje.getFullYear());
    setMes(hoje.getMonth());
    setDia(hoje.getDate());
  }

  // Parcelas filtradas para o mês
  const parcelasMes = useMemo(() => parcelas.filter((p) => {
    const d = new Date(p.dataVencimento);
    if (d.getFullYear() !== ano || d.getMonth() !== mes) return false;
    if (clienteFiltro && p.clienteId !== clienteFiltro)  return false;
    if (statusFiltro !== "todos" && p.status !== statusFiltro.toUpperCase()) return false;
    if (busca && !p.clienteNome.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  }), [parcelas, ano, mes, clienteFiltro, statusFiltro, busca]);

  // Despesas filtradas para o mês (não afetadas por filtros de cliente)
  const despesasMes = useMemo(() => despesas.filter((d) => {
    const date = new Date(d.dataVencimento);
    if (date.getFullYear() !== ano || date.getMonth() !== mes) return false;
    if (busca && !d.descricao.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  }), [despesas, ano, mes, busca]);

  // Parcelas por dia
  const porDia = useMemo(() => {
    const m: Record<number, ParcelaCalendario[]> = {};
    parcelasMes.forEach((p) => {
      const dia = new Date(p.dataVencimento).getDate();
      if (!m[dia]) m[dia] = [];
      m[dia].push(p);
    });
    return m;
  }, [parcelasMes]);

  // Despesas por dia
  const despesasPorDia = useMemo(() => {
    const m: Record<number, DespesaCalendario[]> = {};
    despesasMes.forEach((d) => {
      const dia = new Date(d.dataVencimento).getDate();
      if (!m[dia]) m[dia] = [];
      m[dia].push(d);
    });
    return m;
  }, [despesasMes]);

  // Dados do dia selecionado
  const parcelasDia = diaSelecionado ? (porDia[diaSelecionado] ?? []) : parcelasMes;
  const despesasDia = diaSelecionado ? (despesasPorDia[diaSelecionado] ?? []) : despesasMes;

  // Resumo do mês
  const resumo = useMemo(() => ({
    total:     parcelasMes.length,
    pendente:  parcelasMes.filter(p => p.status === "PENDENTE" || (p.status === "ATRASADO" && obterMeiaNoiteBR(p.dataVencimento).getTime() === hoje.getTime())).reduce((s, p) => s + p.valorDevido, 0),
    atrasado:  parcelasMes.filter(p => p.status === "ATRASADO" && obterMeiaNoiteBR(p.dataVencimento) < hoje).reduce((s, p) => s + p.valorDevido, 0),
    pago:      parcelasMes.filter(p => p.status === "PAGO").reduce((s, p) => s + (p.valorDevido), 0),
    totalValor:parcelasMes.reduce((s, p) => s + p.valorDevido, 0),
    countPago: parcelasMes.filter(p => p.status === "PAGO").length,
    countAtraso:parcelasMes.filter(p => p.status === "ATRASADO" && obterMeiaNoiteBR(p.dataVencimento) < hoje).length,
  }), [parcelasMes, hoje]);

  // Grid do calendário
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes   = new Date(ano, mes + 1, 0).getDate();

  function getDotColor(p: ParcelaCalendario) {
    if (p.status === "ATRASADO") return "bg-red-500";
    if (p.status === "PAGO")     return "bg-slate-300";
    const d = obterMeiaNoiteBR(p.dataVencimento);
    const diff = Math.floor((d.getTime() - hoje.getTime()) / 86400000);
    if (diff === 0) return "bg-blue-500";
    if (diff <= 2 && diff > 0) return "bg-amber-500";
    return "bg-blue-500";
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight">Calendario de Vencimentos</h1>
          <p className="text-xs text-slate-400 mt-0.5">{MESES[mes]} {ano}</p>
        </div>
        <button onClick={irHoje}
          className="text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors">
          Ir para hoje
        </button>
      </div>

      {/* Filtros */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Busca por nome */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar..."
              className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
            {busca && (
              <button onClick={() => setBusca("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={13}/>
              </button>
            )}
          </div>

          {/* Cliente */}
          <select value={clienteFiltro} onChange={(e) => setClienteFiltro(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-500">
            <option value="">Todos os clientes</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>

          {/* Status */}
          <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-500">
            <option value="todos">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="atrasado">Atrasado</option>
            <option value="pago">Pago</option>
          </select>

          {/* Limpar filtros */}
          {(clienteFiltro || statusFiltro !== "todos" || busca) && (
            <button
              onClick={() => { setClienteFiltro(""); setStatusFiltro("todos"); setBusca(""); }}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
              <X size={13}/> Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Resumo do mês */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Cobranças no mes", value: formatarMoeda(resumo.totalValor), sub: `${resumo.total} parcelas` },
          { label: "A receber",        value: formatarMoeda(resumo.pendente),   sub: "Pendentes" },
          { label: "Em atraso",        value: formatarMoeda(resumo.atrasado),   sub: `${resumo.countAtraso} parcelas`, red: resumo.countAtraso > 0 },
          { label: "Recebido no mes",  value: formatarMoeda(resumo.pago),       sub: `${resumo.countPago} pagas` },
        ].map(({ label, value, sub, red }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className={`text-lg font-black mt-1 tabular-nums ${red ? "text-red-600" : "text-slate-900"}`}>{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Grid + Lista */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Calendario */}
        <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white shadow-sm p-5">
          {/* Navegação */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMes}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
              <ChevronLeft size={16}/>
            </button>
            <h2 className="text-base font-bold text-slate-900">
              {MESES[mes]} {ano}
            </h2>
            <button onClick={nextMes}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
              <ChevronRight size={16}/>
            </button>
          </div>

          {/* Cabeçalho dias */}
          <div className="grid grid-cols-7 mb-2">
            {DIAS.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
            ))}
          </div>

          {/* Grid de Dias */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: primeiroDia }).map((_, i) => <div key={`e${i}`}/>)}
            {Array.from({ length: diasNoMes }, (_, i) => {
              const dia = i + 1;
              const parcs = porDia[dia] ?? [];
              const desps = despesasPorDia[dia] ?? [];
              const isHoje = dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear();
              const isSel  = dia === diaSelecionado;

              const temAtraso   = parcs.some(p => p.status === "ATRASADO" && obterMeiaNoiteBR(p.dataVencimento) < hoje);
              const temPendente = parcs.some(p => p.status === "PENDENTE" || (p.status === "ATRASADO" && obterMeiaNoiteBR(p.dataVencimento).getTime() === hoje.getTime()));
              const temPago     = parcs.some(p => p.status === "PAGO");
              const temDespesa  = desps.length > 0;

              return (
                <button key={dia}
                  onClick={() => setDia(diaSelecionado === dia ? null : dia)}
                  className={`relative min-h-[52px] rounded-xl p-1.5 border text-left transition-all ${
                    isSel  ? "bg-slate-900 border-slate-900 text-white" :
                    isHoje ? "border-slate-300 bg-slate-50" :
                    (parcs.length > 0 || desps.length > 0) ? "border-slate-200 hover:border-slate-400 hover:bg-slate-50" :
                    "border-transparent hover:border-slate-100"
                  }`}
                >
                  <p className={`text-xs font-bold ${isSel ? "text-white" : isHoje ? "text-slate-900" : "text-slate-700"}`}>
                    {dia}
                  </p>
                  {/* Dots de status */}
                  <div className="flex gap-0.5 mt-1 flex-wrap">
                    {temAtraso   && <div className="h-1.5 w-1.5 rounded-full bg-red-500"/>}
                    {temPendente && <div className="h-1.5 w-1.5 rounded-full bg-blue-500"/>}
                    {temPago     && <div className="h-1.5 w-1.5 rounded-full bg-slate-300"/>}
                    {temDespesa  && <div className="h-1.5 w-1.5 rounded-full bg-slate-400"/>}
                  </div>
                  {(parcs.length + desps.length) > 1 && (
                    <p className={`text-[10px] leading-none mt-0.5 font-medium ${isSel ? "text-slate-200" : "text-slate-400"}`}>
                      {parcs.length + desps.length}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 flex-wrap">
            {[
              { cor: "bg-red-500",   label: "Atrasado" },
              { cor: "bg-blue-500",  label: "Pendente" },
              { cor: "bg-amber-500", label: "Vence em breve" },
              { cor: "bg-slate-300", label: "Pago" },
              { cor: "bg-slate-400", label: "Despesa Interna" },
            ].map(({ cor, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full ${cor}`}/>
                <span className="text-xs text-slate-500">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Painel direito: lista de parcelas e despesas */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {diaSelecionado
                  ? `${diaSelecionado} de ${MESES[mes]}`
                  : `${MESES[mes]} completo`}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {parcelasDia.length} cobrança{parcelasDia.length !== 1 ? "s" : ""} · {despesasDia.length} despesa{despesasDia.length !== 1 ? "s" : ""}
              </p>
            </div>
            {diaSelecionado && (
              <button onClick={() => setDia(null)} className="text-xs text-slate-400 hover:text-slate-700">
                Ver mes
              </button>
            )}
          </div>

          <div className="overflow-y-auto max-h-[420px] divide-y divide-slate-100 flex-1">
            {/* Seção de parcelas de clientes */}
            <div className="px-5 py-2 bg-slate-50 text-[10px] font-semibold text-slate-400 uppercase tracking-wider sticky top-0">
              Cobranças de Clientes
            </div>
            {parcelasDia.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Nenhuma cobrança registrada</p>
            ) : (
              parcelasDia
                .sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime())
                .map((p) => {
                  const venc = obterMeiaNoiteBR(p.dataVencimento);
                  const diasAtraso = p.status === "ATRASADO"
                    ? Math.floor((hoje.getTime() - venc.getTime()) / 86400000)
                    : 0;
                  const diasAte = ["PENDENTE","PARCIAL"].includes(p.status)
                    ? Math.max(0, Math.floor((venc.getTime() - hoje.getTime()) / 86400000))
                    : 0;

                  return (
                    <div key={p.id} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                      <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${getDotColor(p)}`}/>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <Link href={`/clientes/${p.clienteId}`}
                            className="text-sm font-semibold text-slate-800 hover:text-slate-900 transition-colors truncate">
                            {p.clienteNome}
                          </Link>
                          <StatusBadge status={(p.status === "PAGO" ? "PAGO" : (obterMeiaNoiteBR(p.dataVencimento).getTime() === hoje.getTime() ? "DIA_DE_PAGAR" : p.status)) as any}/>
                        </div>
                        <div className="flex items-center gap-3 text-slate-400 text-[10px]">
                          <span>Parcela {p.numero}</span>
                          {diasAtraso > 0 && <span className="font-semibold text-red-600">{diasAtraso}d atraso</span>}
                          {diasAte > 0 && <span>em {diasAte}d</span>}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {venc.toLocaleDateString("pt-BR")}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-slate-900 tabular-nums">
                          {formatarMoeda(p.valorDevido)}
                        </p>
                        {["PENDENTE","ATRASADO"].includes(p.status) && p.clientePhone && (
                          <a
                            href={`https://wa.me/${p.clientePhone.replace(/\D/g,"")}?text=${encodeURIComponent(
                              `Olá *${p.clienteNome}*! Sua parcela de *${formatarMoeda(p.valorDevido)}* vence em *${venc.toLocaleDateString("pt-BR")}*.\n_Zap Empréstimos_`
                            )}`}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 hover:text-emerald-600 transition-colors mt-0.5"
                          >
                            <MessageCircle size={10}/>
                            WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
            )}

            {/* Seção de despesas operacionais */}
            <div className="px-5 py-2 bg-slate-50 text-[10px] font-semibold text-slate-400 uppercase tracking-wider sticky top-0">
              Despesas Internas
            </div>
            {despesasDia.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Nenhuma despesa registrada</p>
            ) : (
              despesasDia.map((d) => (
                <div key={d.id} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="mt-1.5 h-2 w-2 rounded-full shrink-0 bg-slate-400"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{d.descricao}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">Despesa</span>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${d.status === "PAGO" ? "bg-slate-100 text-slate-700" : "bg-red-50 text-red-600"}`}>
                        {d.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Vencimento: {new Date(d.dataVencimento).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-800 tabular-nums">-{formatarMoeda(d.valor)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
