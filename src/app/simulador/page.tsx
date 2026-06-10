"use client";

import { useState, useMemo, useEffect } from "react";
import { Calculator, ChevronDown, ChevronUp, Info } from "lucide-react";
import { formatarMoeda, formatarData } from "@/lib/utils";
import { simularMensalRolavel } from "@/lib/calculo/liquidacao";
import { calcularEmprestimo, calcularJurosAtraso } from "@/lib/calculo/juros";

type Modo    = "mensal" | "parcelado";
type Periodo = "DIARIO" | "SEMANAL" | "QUINZENAL" | "MENSAL";

const periodMap: Record<Periodo, { label: string; dias: number }> = {
  DIARIO:    { label: "Diário",    dias: 1  },
  SEMANAL:   { label: "Semanal",  dias: 7  },
  QUINZENAL: { label: "Quinzenal",dias: 15 },
  MENSAL:    { label: "Mensal",   dias: 30 },
};

function addDias(data: Date, dias: number): Date {
  const d = new Date(data);
  d.setDate(d.getDate() + dias);
  return d;
}

export default function SimuladorPage() {
  const [modo,         setModo]      = useState<Modo>("mensal");
  const [principal,    setPrincipal] = useState(10000);
  const [taxaMensal,   setTaxaMensal]= useState(30);
  const [meses,        setMeses]     = useState(3);
  const [nParcelas,    setNParcelas] = useState(6);
  const [dataInicio,   setData]      = useState(new Date().toISOString().split("T")[0]);
  const [period,       setPeriod]    = useState<Periodo>("MENSAL");
  const [tabVis,       setTabVis]    = useState(false);
  const [diasAtraso,   setDiasAtraso]= useState(0);
  const [regraAtraso,  setRegra]     = useState<"A" | "B">("A");
  const [taxaDiaria,   setTaxaDiaria]= useState(1);
  const [taxas,        setTaxas]     = useState<Record<number, number>>({});
  const [abatimento,   setAbatimento]= useState(0); // cenário C no mensal

  // Busca taxas de parcelamento via API (não usa store legado)
  useEffect(() => {
    fetch("/api/configuracoes/taxas")
      .then((r) => r.ok ? r.json() : {})
      .then((d: unknown) => {
        if (d && typeof d === "object" && !Array.isArray(d)) {
          const normalized: Record<number, number> = {};
          Object.entries(d as Record<string, unknown>).forEach(([k, v]) => {
            if (typeof v === "number") normalized[Number(k)] = v;
          });
          setTaxas(normalized);
        }
      })
      .catch(() => {});
  }, []);

  // ─── Mensal Rolável ───────────────────────────────────────────────────────
  const simulacaoMensal = useMemo(
    () => simularMensalRolavel({ principal, taxaMensal, meses }),
    [principal, taxaMensal, meses]
  );
  const jurosMes         = simulacaoMensal[0]?.juros ?? 0;
  const jurosTotalMensal = simulacaoMensal.reduce((s, p) => s + p.juros, 0);

  // Cenário C — abatimento parcial: principal reduz a cada mês
  const cenarioAbatimento = useMemo(() => {
    if (abatimento <= 0) return [];
    const periodos = [];
    let saldo = principal;
    for (let i = 1; i <= meses && saldo > 0; i++) {
      const juros   = Number((saldo * taxaMensal / 100).toFixed(2));
      const abate   = Math.min(abatimento, saldo);
      const pagar   = Number((juros + abate).toFixed(2));
      saldo         = Number(Math.max(0, saldo - abate).toFixed(2));
      const venc    = addDias(new Date(dataInicio), 30 * i);
      periodos.push({ mes: i, saldo_inicio: saldo + abate, juros, abate, pagar, saldo_fim: saldo, venc });
    }
    return periodos;
  }, [principal, taxaMensal, meses, abatimento, dataInicio]);

  // ─── Parcelado ────────────────────────────────────────────────────────────
  const taxaParcelado = taxas[nParcelas] ?? 0;
  const { dias }      = periodMap[period];

  const resultadoParcelado = useMemo(() => {
    if (taxaParcelado <= 0) return null;
    return calcularEmprestimo(
      { valorPrincipal: principal, taxaJuros: taxaParcelado, numParcelas: nParcelas, tipo: "simples" },
      new Date(dataInicio),
      dias
    );
  }, [principal, taxaParcelado, nParcelas, dataInicio, dias]);

  // ─── Juros de atraso ──────────────────────────────────────────────────────
  const valorBaseParcela = modo === "mensal" ? jurosMes : (resultadoParcelado?.valorParcela ?? 0);
  const dataVencSimulada = useMemo(() => {
    const d = new Date(dataInicio);
    d.setDate(d.getDate() + (modo === "mensal" ? 30 : dias) - diasAtraso);
    return d;
  }, [dataInicio, modo, dias, diasAtraso]);

  const jurosAtrasoA = useMemo(() => {
    if (diasAtraso <= 0) return 0;
    return Number((valorBaseParcela * diasAtraso * taxaDiaria / 100).toFixed(2));
  }, [valorBaseParcela, diasAtraso, taxaDiaria]);

  // Para Regra B no mensal: base é o saldo devedor; no parcelado: saldo restante
  const jurosAtrasoB = useMemo(() => {
    if (diasAtraso <= 0) return 0;
    const base = modo === "mensal" ? principal : (valorBaseParcela * 0.6); // estimativa saldo médio
    return Number((base * diasAtraso * taxaDiaria / 100).toFixed(2));
  }, [valorBaseParcela, diasAtraso, taxaDiaria, modo, principal]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Calculator size={20} className="text-blue-700" />
        <div>
          <h1 className="text-base font-semibold text-slate-900 tracking-tight">Simulador de Empréstimos</h1>
          <p className="text-xs text-slate-500 mt-0.5">Simule as duas modalidades antes de formalizar — sem entrada</p>
        </div>
      </div>

      {/* Painel Informativo sobre Regras Financeiras */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 leading-relaxed space-y-2">
        <p className="font-semibold text-slate-700">Funcionamento das Modalidades e Juros de Atraso:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li><strong>Mensal Rolável</strong>: O devedor paga apenas a taxa de juros do mês para prorrogar a liquidação do principal por mais 30 dias (renovação). Caso deseje abater a dívida ou quitá-la (Opção C), os juros subsequentes incidirão apenas sobre o saldo devedor restante.</li>
          <li><strong>Parcelado</strong>: O principal é dividido de acordo com a quantidade de parcelas desejada, aplicando as taxas percentuais salvas na aba de parcelamento das configurações.</li>
          <li><strong>Juros de Atraso Diário</strong>: Regra A calcula os juros com base no valor integral da parcela. Regra B aplica os juros diários estritamente sob o saldo restante (após amortizações parciais).</li>
        </ul>
      </div>

      {/* Seletor de modo */}
      <div className="flex gap-2">
        {([
          ["mensal",    "Mensal Rolável",  "Juros mensais · Abate quando quiser"],
          ["parcelado", "Parcelado",       "Taxa fixa · Dividida em parcelas"],
        ] as const).map(([v, l, d]) => (
          <button key={v} onClick={() => setModo(v)}
            className={`flex-1 rounded-xl border px-4 py-3 text-left transition-all ${modo === v ? "bg-slate-900 border-slate-900 text-white" : "border-slate-200 hover:border-slate-400"}`}>
            <p className={`text-sm font-semibold ${modo === v ? "text-white" : "text-slate-700"}`}>{l}</p>
            <p className={`text-xs mt-0.5 ${modo === v ? "text-slate-400" : "text-slate-400"}`}>{d}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Parâmetros */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-900">Parâmetros</p>

          <Num label="Valor do Empréstimo (R$)" value={principal} onChange={setPrincipal} step={500} min={100} />

          {modo === "mensal" && (
            <>
              <Num label="Taxa Mensal (%)" value={taxaMensal} onChange={setTaxaMensal} step={1} min={1} max={100} />
              <Num label="Meses para simular" value={meses} onChange={setMeses} step={1} min={1} max={24} />
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Abatimento mensal — Cenário C (R$)</label>
                <input type="number" value={abatimento} step={500} min={0} max={principal}
                  onChange={(e) => setAbatimento(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-500 transition-colors" />
                {abatimento > 0 && (
                  <p className="text-[10px] text-slate-400 mt-1">Paga juros + R$ {abatimento.toLocaleString("pt-BR")} por mês para reduzir a dívida</p>
                )}
              </div>
            </>
          )}

          {modo === "parcelado" && (
            <>
              <Num label="Número de Parcelas" value={nParcelas} onChange={setNParcelas} step={1} min={2} max={24} />
              {taxaParcelado > 0 ? (
                <div className="rounded-xl border border-blue-100 bg-blue-50/30 px-3 py-2.5">
                  <p className="text-xs text-blue-700 font-medium">Taxa para {nParcelas}x: <span className="font-bold">{taxaParcelado}%</span></p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-xs text-slate-500">Sem taxa configurada para {nParcelas}x. Configure em Configurações.</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Periodicidade</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.keys(periodMap) as Periodo[]).map((p) => (
                    <button key={p} onClick={() => setPeriod(p)}
                      className={`rounded-xl py-2 text-xs font-medium border transition-all ${period === p ? "bg-slate-900 border-slate-900 text-white" : "border-slate-200 text-slate-500 hover:border-slate-400"}`}>
                      {periodMap[p].label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Data de Início</label>
            <input type="date" value={dataInicio} onChange={(e) => setData(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-500" />
          </div>

          {/* Simulação de Atraso */}
          <div className="rounded-xl border border-slate-200 p-3 space-y-3">
            <div className="flex items-center gap-1.5">
              <Info size={12} className="text-slate-400" />
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Simular Atraso</p>
            </div>
            <Num label="Dias em atraso" value={diasAtraso} onChange={setDiasAtraso} step={1} min={0} max={90} />
            <Num label="Taxa de atraso (%/dia)" value={taxaDiaria} onChange={setTaxaDiaria} step={0.5} min={0.1} max={5} />
            <div>
              <p className="text-[10px] font-medium text-slate-400 mb-1.5">Regra de atraso</p>
              <div className="grid grid-cols-2 gap-1.5">
                {(["A", "B"] as const).map((r) => (
                  <button key={r} onClick={() => setRegra(r)}
                    className={`rounded-lg py-1.5 text-xs font-medium border transition-all ${regraAtraso === r ? "bg-slate-900 border-slate-900 text-white" : "border-slate-200 text-slate-500 hover:border-slate-400"}`}>
                    {r === "A" ? "A (parcela)" : "B (saldo)"}
                  </button>
                ))}
              </div>
              {diasAtraso > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Regra A (parcela inteira):</span>
                    <span className="font-bold text-red-600">+{formatarMoeda(jurosAtrasoA)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Regra B (saldo restante):</span>
                    <span className="font-bold text-orange-500">+{formatarMoeda(jurosAtrasoB)}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 pt-1">Regra configurável por perfil em Configurações</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Resultados */}
        <div className="lg:col-span-2 space-y-4">

          {/* ── Mensal Rolável ── */}
          {modo === "mensal" && (
            <>
              <div className="grid grid-cols-3 gap-3">
                {[
                  ["Principal",   formatarMoeda(principal)],
                  ["Juros/mês",   formatarMoeda(jurosMes)],
                  ["Taxa mensal", `${taxaMensal}%`],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-xs text-slate-500">{l}</p>
                    <p className="text-base font-bold text-slate-900 mt-0.5">{v}</p>
                  </div>
                ))}
              </div>

              {/* 3 Cenários */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                <p className="text-sm font-semibold text-slate-900">Opções no Vencimento</p>
                <div className="space-y-2">
                  {[
                    {
                      op: "A",
                      titulo: "Quitar a dívida",
                      desc: `Paga ${formatarMoeda(principal + jurosMes)} (principal + juros) → dívida encerrada`,
                      valor: principal + jurosMes,
                      color: "bg-slate-50 border-slate-200",
                    },
                    {
                      op: "B",
                      titulo: "Pagar só os juros (renovação)",
                      desc: `Paga ${formatarMoeda(jurosMes)} → principal continua intacto no próximo mês`,
                      valor: jurosMes,
                      color: "bg-blue-50/30 border-blue-100/50",
                    },
                    {
                      op: "C",
                      titulo: "Abatimento parcial do principal",
                      desc: abatimento > 0
                        ? `Paga juros (${formatarMoeda(jurosMes)}) + ${formatarMoeda(abatimento)} do principal → saldo reduz para ${formatarMoeda(Math.max(0, principal - abatimento))}`
                        : `Paga juros + valor extra → saldo devedor reduz, próximo mês juros menores`,
                      valor: abatimento > 0 ? jurosMes + Math.min(abatimento, principal) : null,
                      color: "bg-slate-50 border-slate-200",
                    },
                  ].map((o) => (
                    <div key={o.op} className={`flex items-start gap-3 rounded-xl border p-3 ${o.color}`}>
                      <span className="h-6 w-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0">{o.op}</span>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-800">{o.titulo}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{o.desc}</p>
                      </div>
                      {o.valor !== null && (
                        <span className="text-sm font-bold text-slate-900 tabular-nums shrink-0">{formatarMoeda(o.valor)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabela mensal */}
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">Projeção por Mês</p>
                  <p className="text-xs text-slate-400">Cenário: pagando só os juros</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {["Mês", "Vencimento", "Saldo Devedor", "Juros", "Pagar Juros", "Para Quitar"].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left font-semibold text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {simulacaoMensal.map((p) => {
                        const venc = addDias(new Date(dataInicio), 30 * p.mes);
                        return (
                          <tr key={p.mes} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 font-bold text-slate-900">{p.mes}</td>
                            <td className="px-4 py-2.5 text-slate-500">{formatarData(venc.toISOString())}</td>
                            <td className="px-4 py-2.5 font-semibold text-slate-900 tabular-nums">{formatarMoeda(p.saldoInicio)}</td>
                            <td className="px-4 py-2.5 text-blue-700 font-semibold tabular-nums">{formatarMoeda(p.juros)}</td>
                            <td className="px-4 py-2.5 text-slate-700 tabular-nums">{formatarMoeda(p.pagandoJuros)}</td>
                            <td className="px-4 py-2.5 font-bold text-slate-900 tabular-nums">{formatarMoeda(p.paraQuitar)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t border-slate-200 bg-slate-50">
                      <tr>
                        <td colSpan={3} className="px-4 py-2.5 text-xs font-semibold text-slate-500">Total de juros acumulados</td>
                        <td colSpan={3} className="px-4 py-2.5 font-bold text-blue-700 tabular-nums">{formatarMoeda(jurosTotalMensal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Cenário C — abatimento */}
              {abatimento > 0 && cenarioAbatimento.length > 0 && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50/10 overflow-hidden">
                  <div className="px-5 py-4 border-b border-blue-100">
                    <p className="text-sm font-semibold text-slate-900">Cenário C — Abatendo {formatarMoeda(abatimento)}/mês</p>
                    <p className="text-xs text-slate-500 mt-0.5">Juros calculados sobre o saldo devedor reduzido</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-white/60">
                        <tr className="border-b border-blue-100">
                          {["Mês", "Vencimento", "Saldo Início", "Juros", "Abate", "Total a Pagar", "Saldo Fim"].map((h) => (
                            <th key={h} className="px-4 py-2.5 text-left font-semibold text-slate-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-50/50">
                        {cenarioAbatimento.map((p) => (
                          <tr key={p.mes} className="hover:bg-white/40">
                            <td className="px-4 py-2.5 font-bold text-slate-900">{p.mes}</td>
                            <td className="px-4 py-2.5 text-slate-500">{formatarData(p.venc.toISOString())}</td>
                            <td className="px-4 py-2.5 font-semibold text-slate-900 tabular-nums">{formatarMoeda(p.saldo_inicio)}</td>
                            <td className="px-4 py-2.5 text-blue-700 tabular-nums">{formatarMoeda(p.juros)}</td>
                            <td className="px-4 py-2.5 text-slate-700 tabular-nums">{formatarMoeda(p.abate)}</td>
                            <td className="px-4 py-2.5 font-bold text-slate-900 tabular-nums">{formatarMoeda(p.pagar)}</td>
                            <td className={`px-4 py-2.5 font-semibold tabular-nums ${p.saldo_fim === 0 ? "text-blue-700" : "text-slate-700"}`}>
                              {p.saldo_fim === 0 ? "Quitado" : formatarMoeda(p.saldo_fim)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <a href={`/emprestimos/novo?principal=${principal}&taxa=${taxaMensal}&tipo=MENSAL&modalidade=MENSAL_ROLAVEL`}
                className="block w-full text-center rounded-xl border border-blue-700 bg-blue-700 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors">
                Criar Contrato Mensal Rolável
              </a>
            </>
          )}

          {/* ── Parcelado ── */}
          {modo === "parcelado" && resultadoParcelado && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Principal",       formatarMoeda(principal)],
                  ["Taxa",            `${taxaParcelado}%`],
                  ["Total",           formatarMoeda(resultadoParcelado.valorTotal)],
                  ["Parcela",         formatarMoeda(resultadoParcelado.valorParcela)],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-xs text-slate-500">{l}</p>
                    <p className="text-base font-bold text-slate-900 mt-0.5">{v}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-900">Resumo do Parcelamento</p>
                  <p className="text-2xl font-black text-slate-900">{formatarMoeda(resultadoParcelado.valorParcela)}</p>
                </div>
                <div className="h-px bg-slate-100" />
                {[
                  ["Principal",                formatarMoeda(principal)],
                  [`Juros totais (${taxaParcelado}%)`, formatarMoeda(resultadoParcelado.totalJuros)],
                  ["Total do contrato",        formatarMoeda(resultadoParcelado.valorTotal)],
                  [`${nParcelas}x de`,         formatarMoeda(resultadoParcelado.valorParcela)],
                ].map(([l, v]) => (
                  <div key={l} className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{l}</span>
                    <span className="text-sm font-semibold text-slate-900">{v}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-slate-100 text-xs text-slate-400">
                  Excedente de pagamento fica retido e desconta na próxima parcela · Sem entrada
                </div>
              </div>

              {/* Tabela com decomposição por parcela */}
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">Decomposição por Parcela</p>
                  <button onClick={() => setTabVis(!tabVis)} className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1">
                    {tabVis ? <><ChevronUp size={12} /> Ocultar</> : <><ChevronDown size={12} /> Ver todas</>}
                  </button>
                </div>
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {["#", "Vencimento", "Principal", "Juros", "Total Parcela", "Saldo"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left font-semibold text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(tabVis ? resultadoParcelado.parcelas : resultadoParcelado.parcelas.slice(0, 4)).map((row) => (
                      <tr key={row.numero} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 text-slate-400">{row.numero}</td>
                        <td className="px-4 py-2.5 text-slate-500">{formatarData(row.dataVencimento.toISOString())}</td>
                        <td className="px-4 py-2.5 text-slate-700 tabular-nums">{formatarMoeda(row.valorPrincipal)}</td>
                        <td className="px-4 py-2.5 text-blue-700 tabular-nums">{formatarMoeda(row.valorJuros)}</td>
                        <td className="px-4 py-2.5 font-semibold text-slate-900 tabular-nums">{formatarMoeda(row.valorDevido)}</td>
                        <td className="px-4 py-2.5 text-slate-400 tabular-nums">{formatarMoeda(row.saldoDevedor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <a href={`/emprestimos/novo?principal=${principal}&taxa=${taxaParcelado}&parcelas=${nParcelas}&tipo=${period}`}
                className="block w-full text-center rounded-xl border border-blue-700 bg-blue-700 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors">
                Criar Contrato Parcelado
              </a>
            </>
          )}

          {modo === "parcelado" && taxaParcelado <= 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
              <p className="text-sm font-semibold text-amber-800">Taxa não configurada para {nParcelas}x</p>
              <p className="text-xs text-amber-600 mt-1">Configure as taxas de parcelamento em Configurações → Parcelamento</p>
              <a href="/configuracoes?tab=parcelamento" className="mt-3 inline-block text-xs text-amber-700 underline">
                Ir para Configurações
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Num({ label, value, onChange, step, min, max }: {
  label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      <input type="number" value={value} step={step} min={min} max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-500 transition-colors" />
    </div>
  );
}
