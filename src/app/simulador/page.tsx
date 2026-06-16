"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Calculator, ChevronDown, ChevronUp, AlertTriangle,
  Clock, TrendingUp, Info, CheckCircle2
} from "lucide-react";
import { formatarMoeda, formatarData } from "@/lib/utils";
import { simularMensalRolavel } from "@/lib/calculo/liquidacao";
import { calcularEmprestimo } from "@/lib/calculo/juros";

type Modo    = "mensal" | "parcelado";
type Periodo = "DIARIO" | "SEMANAL" | "QUINZENAL" | "MENSAL";
type RegraAtraso   = "A" | "B";
type TipoValorAtr  = "PERCENTUAL" | "VALOR";
type TipoTaxaAtr   = "fixa" | "custom";

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

// ── Descrições das regras ─────────────────────────────────────────────────────
const REGRA_A_DESC = "Juros de atraso incidem sobre o valor total da parcela. Ex.: parcela de R$ 500 com 2%/dia → R$ 10/dia de atraso, independente de quanto já foi pago.";
const REGRA_B_DESC = "Juros de atraso incidem sobre o saldo devedor (capital restante). O valor cobrado por atraso reduz conforme o cliente amorza parcialmente o principal.";
const FIXA_DESC    = "Taxa padrão de 1% ao dia sobre o valor base (Regra A ou B). Simples e previsível.";
const CUSTOM_PERC_DESC = "Taxa percentual personalizada por dia. Você define o % diário — ideal para contratos diferenciados.";
const CUSTOM_VALOR_DESC = "Valor fixo em R$ por dia de atraso, independente do saldo. Ex.: R$ 5,00/dia — fácil de comunicar ao cliente.";

export default function SimuladorPage() {
  const [modo,         setModo]      = useState<Modo>("mensal");
  const [principal,    setPrincipal] = useState<number | "">("");
  const [taxaMensal,   setTaxaMensal]= useState<number | "">("");
  const [meses,        setMeses]     = useState<number | "">(3);
  const [nParcelas,    setNParcelas] = useState<number | "">(6);
  const [dataInicio,   setData]      = useState(new Date().toISOString().split("T")[0]);
  const [period,       setPeriod]    = useState<Periodo>("MENSAL");
  const [tabVis,       setTabVis]    = useState(false);
  const [abatimento,   setAbatimento]= useState(0);
  const [taxas,        setTaxas]     = useState<Record<number, number>>({});

  // ── Configuração de Atraso ──
  const [diasAtraso,     setDiasAtraso]    = useState<number | "">(0);
  const [regraAtraso,    setRegra]         = useState<RegraAtraso>("A");
  const [tipoTaxaAtr,    setTipoTaxaAtr]   = useState<TipoTaxaAtr>("fixa");
  const [tipoValorAtr,   setTipoValorAtr]  = useState<TipoValorAtr>("PERCENTUAL");
  const [taxaDiaria,     setTaxaDiaria]    = useState<number | "">(1);
  // dias de carência: quantos dias de atraso antes de cobrar
  const [diasCarencia,   setDiasCarencia]  = useState<number | "">(0);

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

  // ── Derivados ──────────────────────────────────────────────────────────────
  const principalNum  = Number(principal)  || 0;
  const taxaMensalNum = Number(taxaMensal) || 0;
  const mesesNum      = Number(meses)      || 0;
  const nParcelasNum  = Number(nParcelas)  || 0;
  const diasAtrasoNum = Number(diasAtraso) || 0;
  const diasCarenciaNum = Number(diasCarencia) || 0;
  const taxaDiariaNum = Number(taxaDiaria) || (tipoTaxaAtr === "fixa" ? 1 : 0);

  // dias efetivos de cobrança (descontando carência)
  const diasEfetivos = Math.max(0, diasAtrasoNum - diasCarenciaNum);

  // taxa efetiva
  const taxaEfetiva = tipoTaxaAtr === "fixa" ? 1 : taxaDiariaNum;
  const isPercentual = tipoTaxaAtr === "fixa" || tipoValorAtr === "PERCENTUAL";

  // ── Mensal Rolável ─────────────────────────────────────────────────────────
  const simulacaoMensal = useMemo(
    () => simularMensalRolavel({ principal: principalNum, taxaMensal: taxaMensalNum, meses: mesesNum }),
    [principalNum, taxaMensalNum, mesesNum]
  );
  const jurosMes         = simulacaoMensal[0]?.juros ?? 0;
  const jurosTotalMensal = simulacaoMensal.reduce((s, p) => s + p.juros, 0);

  const cenarioAbatimento = useMemo(() => {
    if (abatimento <= 0) return [];
    const periodos = [];
    let saldo = principalNum;
    for (let i = 1; i <= mesesNum && saldo > 0; i++) {
      const juros = Number((saldo * taxaMensalNum / 100).toFixed(2));
      const abate = Math.min(abatimento, saldo);
      const pagar = Number((juros + abate).toFixed(2));
      saldo       = Number(Math.max(0, saldo - abate).toFixed(2));
      const venc  = new Date(dataInicio);
      venc.setMonth(venc.getMonth() + i);
      const day = new Date(dataInicio).getDate();
      if (venc.getDate() !== day) venc.setDate(0);
      periodos.push({ mes: i, saldo_inicio: saldo + abate, juros, abate, pagar, saldo_fim: saldo, venc });
    }
    return periodos;
  }, [principalNum, taxaMensalNum, mesesNum, abatimento, dataInicio]);

  // ── Parcelado ──────────────────────────────────────────────────────────────
  const taxaParcelado  = taxas[nParcelasNum] ?? 0;
  const { dias }       = periodMap[period];

  const resultadoParcelado = useMemo(() => {
    if (taxaParcelado <= 0) return null;
    return calcularEmprestimo(
      { valorPrincipal: principalNum, taxaJuros: taxaParcelado, numParcelas: nParcelasNum, tipo: "simples" },
      new Date(dataInicio),
      dias
    );
  }, [principalNum, taxaParcelado, nParcelasNum, dataInicio, dias]);

  // ── Juros de Atraso ────────────────────────────────────────────────────────
  const valorBaseParcela = modo === "mensal" ? jurosMes : (resultadoParcelado?.valorParcela ?? 0);
  const saldoBaseB       = modo === "mensal" ? principalNum : (valorBaseParcela * 0.6);

  function calcJuros(dias: number, regra: RegraAtraso): number {
    if (dias <= 0) return 0;
    if (!isPercentual) return Number((taxaEfetiva * dias).toFixed(2));
    const base = regra === "A" ? valorBaseParcela : saldoBaseB;
    return Number((base * dias * taxaEfetiva / 100).toFixed(2));
  }

  const jurosAtrasoAtual = calcJuros(diasEfetivos, regraAtraso);
  const valorComAtraso   = valorBaseParcela + jurosAtrasoAtual;

  // Projeção de atraso em vários intervalos
  const intervalos = [1, 3, 5, 7, 15, 30, 45, 60];
  const projecaoAtraso = useMemo(() =>
    intervalos.map((d) => {
      const efet = Math.max(0, d - diasCarenciaNum);
      return {
        dias:   d,
        efetivos: efet,
        cobrando: efet > 0,
        jurosA: calcJuros(efet, "A"),
        jurosB: calcJuros(efet, "B"),
        totalA: valorBaseParcela + calcJuros(efet, "A"),
        totalB: saldoBaseB       + calcJuros(efet, "B"),
      };
    }),
    [valorBaseParcela, saldoBaseB, taxaEfetiva, isPercentual, diasCarenciaNum]
  );

  const hasValues = principalNum > 0 && (modo === "mensal" ? taxaMensalNum > 0 : true);
  const temAtraso = diasAtrasoNum > 0 && diasEfetivos > 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Calculator size={20} className="text-blue-700" />
        <div>
          <h1 className="text-base font-semibold text-slate-900 tracking-tight">Simulador de Empréstimos</h1>
          <p className="text-xs text-slate-500 mt-0.5">Simule as duas modalidades e o impacto de atraso antes de formalizar</p>
        </div>
      </div>

      {/* Seletor de modo */}
      <div className="grid grid-cols-2 gap-2">
        {([
          ["mensal",    "Mensal Rolável",  "Juros mensais · Abate quando quiser"],
          ["parcelado", "Parcelado",       "Taxa fixa · Dividida em parcelas"],
        ] as const).map(([v, l, d]) => (
          <button key={v} onClick={() => setModo(v)}
            className={`rounded-xl border px-4 py-3 text-left transition-all ${modo === v ? "bg-slate-900 border-slate-900 text-white" : "border-slate-200 hover:border-slate-400 bg-white"}`}>
            <p className={`text-sm font-semibold ${modo === v ? "text-white" : "text-slate-700"}`}>{l}</p>
            <p className={`text-xs mt-0.5 ${modo === v ? "text-slate-400" : "text-slate-400"}`}>{d}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* ── Painel de Parâmetros ─────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Parâmetros principais */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parâmetros</p>

            <Num label="Valor do Empréstimo (R$)" value={principal} onChange={setPrincipal} step={500} min={0} />

            {modo === "mensal" && (
              <>
                <Num label="Taxa Mensal (%)" value={taxaMensal} onChange={setTaxaMensal} step={1} min={0} max={100} />
                <Num label="Meses para simular" value={meses} onChange={setMeses} step={1} min={1} max={24} />
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Abatimento mensal — Cenário C (R$)</label>
                  <input type="number" value={abatimento === 0 ? "" : String(abatimento)} step={500} min={0} max={principalNum}
                    onChange={(e) => setAbatimento(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-500 transition-colors" />
                  {abatimento > 0 && (
                    <p className="text-[10px] text-slate-400 mt-1">Paga juros + R$ {abatimento.toLocaleString("pt-BR")} por mês</p>
                  )}
                </div>
              </>
            )}

            {modo === "parcelado" && (
              <>
                <Num label="Número de Parcelas" value={nParcelas} onChange={setNParcelas} step={1} min={2} max={24} />
                {taxaParcelado > 0 ? (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/30 px-3 py-2.5">
                    <p className="text-xs text-blue-700 font-medium">Taxa para {nParcelasNum}x: <span className="font-bold">{taxaParcelado}%</span></p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs text-slate-500">Sem taxa para {nParcelasNum}x. Configure em Configurações.</p>
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
          </div>

          {/* ── Configuração de Atraso ─────────────────────────────────────── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500" />
              <p className="text-xs font-bold text-slate-700">Configuração de Atraso</p>
            </div>

            {/* Regra A ou B */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Regra de Incidência</p>
              <div className="grid grid-cols-2 gap-2">
                {(["A", "B"] as const).map((r) => (
                  <button key={r} onClick={() => setRegra(r)}
                    className={`rounded-xl border px-3 py-2.5 text-left transition-all ${regraAtraso === r ? "bg-slate-900 border-slate-900" : "border-slate-200 hover:border-slate-300 bg-white"}`}>
                    <p className={`text-xs font-bold ${regraAtraso === r ? "text-white" : "text-slate-700"}`}>
                      Regra {r} {r === "A" ? "— Parcela" : "— Saldo"}
                    </p>
                    <p className={`text-[10px] mt-0.5 leading-tight ${regraAtraso === r ? "text-slate-400" : "text-slate-400"}`}>
                      {r === "A" ? "Incide sobre a parcela inteira" : "Incide sobre o capital restante"}
                    </p>
                  </button>
                ))}
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  {regraAtraso === "A" ? REGRA_A_DESC : REGRA_B_DESC}
                </p>
              </div>
            </div>

            {/* Tipo de taxa */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo de Cobrança</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setTipoTaxaAtr("fixa"); setTaxaDiaria(1); }}
                  className={`rounded-xl border px-3 py-2.5 text-left transition-all ${tipoTaxaAtr === "fixa" ? "bg-slate-900 border-slate-900" : "border-slate-200 hover:border-slate-300 bg-white"}`}>
                  <p className={`text-xs font-bold ${tipoTaxaAtr === "fixa" ? "text-white" : "text-slate-700"}`}>Fixo (1%/dia)</p>
                  <p className={`text-[10px] mt-0.5 ${tipoTaxaAtr === "fixa" ? "text-slate-400" : "text-slate-400"}`}>Taxa padrão</p>
                </button>
                <button onClick={() => setTipoTaxaAtr("custom")}
                  className={`rounded-xl border px-3 py-2.5 text-left transition-all ${tipoTaxaAtr === "custom" ? "bg-slate-900 border-slate-900" : "border-slate-200 hover:border-slate-300 bg-white"}`}>
                  <p className={`text-xs font-bold ${tipoTaxaAtr === "custom" ? "text-white" : "text-slate-700"}`}>Personalizado</p>
                  <p className={`text-[10px] mt-0.5 ${tipoTaxaAtr === "custom" ? "text-slate-400" : "text-slate-400"}`}>% ou R$/dia</p>
                </button>
              </div>

              {/* Personalizado */}
              {tipoTaxaAtr === "custom" && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button onClick={() => setTipoValorAtr("PERCENTUAL")}
                      className={`rounded-lg border py-2 text-xs font-semibold transition-all ${tipoValorAtr === "PERCENTUAL" ? "bg-blue-700 border-blue-700 text-white" : "border-slate-200 text-slate-500 hover:border-slate-400"}`}>
                      % ao dia
                    </button>
                    <button onClick={() => setTipoValorAtr("VALOR")}
                      className={`rounded-lg border py-2 text-xs font-semibold transition-all ${tipoValorAtr === "VALOR" ? "bg-blue-700 border-blue-700 text-white" : "border-slate-200 text-slate-500 hover:border-slate-400"}`}>
                      R$ por dia
                    </button>
                  </div>
                  <Num
                    label={tipoValorAtr === "PERCENTUAL" ? "Taxa de atraso (% ao dia)" : "Taxa de atraso (R$ ao dia)"}
                    value={taxaDiaria}
                    onChange={(v) => setTaxaDiaria(v)}
                    step={tipoValorAtr === "PERCENTUAL" ? 0.1 : 1}
                    min={0.01}
                    max={tipoValorAtr === "PERCENTUAL" ? 10 : 500}
                  />
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      {tipoValorAtr === "PERCENTUAL" ? CUSTOM_PERC_DESC : CUSTOM_VALOR_DESC}
                    </p>
                  </div>
                </div>
              )}

              {tipoTaxaAtr === "fixa" && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                  <p className="text-[10px] text-slate-500 leading-relaxed">{FIXA_DESC}</p>
                </div>
              )}
            </div>

            {/* Dias de carência */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Carência (dias sem cobrar)</p>
              <Num label="Dias de carência antes de cobrar juros" value={diasCarencia} onChange={setDiasCarencia} step={1} min={0} max={30} />
              {diasCarenciaNum > 0 && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                  <p className="text-[10px] text-emerald-700">
                    Juros de atraso só começam a incidir após {diasCarenciaNum} dia{diasCarenciaNum !== 1 ? "s" : ""} de atraso.
                  </p>
                </div>
              )}
            </div>

            {/* Simular dias em atraso */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Simular Dias em Atraso</p>
              <Num label="Dias em atraso (para calcular o impacto)" value={diasAtraso} onChange={(v) => setDiasAtraso(v)} step={1} min={0} max={120} />

              {diasAtrasoNum > 0 && (
                <div className={`rounded-xl border px-3 py-3 space-y-2 ${diasEfetivos > 0 ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
                  <div className="flex items-center gap-1.5">
                    {diasEfetivos > 0
                      ? <AlertTriangle size={12} className="text-red-500 shrink-0" />
                      : <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                    }
                    <p className={`text-xs font-bold ${diasEfetivos > 0 ? "text-red-700" : "text-emerald-700"}`}>
                      {diasEfetivos > 0
                        ? `${diasEfetivos} dias com cobrança de juros`
                        : `Dentro da carência — sem juros de atraso`}
                    </p>
                  </div>
                  {diasEfetivos > 0 && (
                    <>
                      <div className="flex justify-between text-xs">
                        <span className="text-red-600">Juros de atraso:</span>
                        <span className="font-bold text-red-700">+{formatarMoeda(jurosAtrasoAtual)}</span>
                      </div>
                      <div className="flex justify-between text-xs border-t border-red-200 pt-2">
                        <span className="text-red-600 font-semibold">Total a receber:</span>
                        <span className="font-bold text-red-900 text-sm">{formatarMoeda(valorComAtraso)}</span>
                      </div>
                    </>
                  )}
                  {diasCarenciaNum > 0 && diasEfetivos > 0 && (
                    <p className="text-[10px] text-red-500">
                      Carência de {diasCarenciaNum}d aplicada — cobrando {diasEfetivos}d dos {diasAtrasoNum}d de atraso
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Painel de Resultados ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {hasValues ? (
            <>
              {/* Mensal Rolável */}
              {modo === "mensal" && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      ["Principal",   formatarMoeda(principalNum)],
                      ["Juros/mês",   formatarMoeda(jurosMes)],
                      ["Taxa mensal", `${taxaMensalNum}%`],
                    ].map(([l, v]) => (
                      <div key={l} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <p className="text-xs text-slate-500">{l}</p>
                        <p className="text-base font-bold text-slate-900 mt-0.5">{v}</p>
                      </div>
                    ))}
                  </div>

                  {/* Cenários */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                    <p className="text-sm font-semibold text-slate-900">Opções no Vencimento</p>
                    <div className="space-y-2">
                      {[
                        {
                          op: "A", titulo: "Quitar a dívida",
                          desc: `Paga ${formatarMoeda(principalNum + jurosMes)} (principal + juros) → dívida encerrada`,
                          valor: principalNum + jurosMes, color: "bg-slate-50 border-slate-200",
                        },
                        {
                          op: "B", titulo: "Pagar só os juros (renovação)",
                          desc: `Paga ${formatarMoeda(jurosMes)} → principal continua intacto no próximo mês`,
                          valor: jurosMes, color: "bg-blue-50/30 border-blue-100",
                        },
                        {
                          op: "C", titulo: "Abatimento parcial do principal",
                          desc: abatimento > 0
                            ? `Paga juros (${formatarMoeda(jurosMes)}) + ${formatarMoeda(abatimento)} do principal → saldo reduz para ${formatarMoeda(Math.max(0, principalNum - abatimento))}`
                            : `Paga juros + valor extra → saldo devedor reduz, próximo mês juros menores`,
                          valor: abatimento > 0 ? jurosMes + Math.min(abatimento, principalNum) : null,
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
                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
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

                  {/* Cenário C */}
                  {abatimento > 0 && cenarioAbatimento.length > 0 && (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/10 overflow-hidden shadow-sm">
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
                                <td className={`px-4 py-2.5 font-semibold tabular-nums ${p.saldo_fim === 0 ? "text-emerald-600" : "text-slate-700"}`}>
                                  {p.saldo_fim === 0 ? "Quitado ✓" : formatarMoeda(p.saldo_fim)}
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

              {/* Parcelado */}
              {modo === "parcelado" && resultadoParcelado && (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      ["Principal", formatarMoeda(principalNum)],
                      ["Taxa",      `${taxaParcelado}%`],
                      ["Total",     formatarMoeda(resultadoParcelado.valorTotal)],
                      ["Parcela",   formatarMoeda(resultadoParcelado.valorParcela)],
                    ].map(([l, v]) => (
                      <div key={l} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <p className="text-xs text-slate-500">{l}</p>
                        <p className="text-base font-bold text-slate-900 mt-0.5">{v}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-slate-900">Resumo do Parcelamento</p>
                      <p className="text-2xl font-black text-slate-900">{formatarMoeda(resultadoParcelado.valorParcela)}</p>
                    </div>
                    <div className="h-px bg-slate-100" />
                    {[
                      ["Principal",                           formatarMoeda(principalNum)],
                      [`Juros totais (${taxaParcelado}%)`,   formatarMoeda(resultadoParcelado.totalJuros)],
                      ["Total do contrato",                  formatarMoeda(resultadoParcelado.valorTotal)],
                      [`${nParcelasNum}x de`,                formatarMoeda(resultadoParcelado.valorParcela)],
                    ].map(([l, v]) => (
                      <div key={l} className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">{l}</span>
                        <span className="text-sm font-semibold text-slate-900">{v}</span>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                    <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">Decomposição por Parcela</p>
                      <button onClick={() => setTabVis(!tabVis)} className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 cursor-pointer">
                        {tabVis ? <><ChevronUp size={12} /> Ocultar</> : <><ChevronDown size={12} /> Ver todas</>}
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>
                            {["#", "Vencimento", "Principal", "Juros", "Total", "Saldo"].map((h) => (
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
                  </div>

                  <a href={`/emprestimos/novo?principal=${principalNum}&taxa=${taxaParcelado}&parcelas=${nParcelasNum}&tipo=${period}`}
                    className="block w-full text-center rounded-xl border border-blue-700 bg-blue-700 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors">
                    Criar Contrato Parcelado
                  </a>
                </>
              )}

              {modo === "parcelado" && taxaParcelado <= 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
                  <p className="text-sm font-semibold text-amber-800">Taxa não configurada para {nParcelasNum}x</p>
                  <p className="text-xs text-amber-600 mt-1">Configure em Configurações → Parcelamento</p>
                  <a href="/configuracoes?tab=parcelamento" className="mt-3 inline-block text-xs text-amber-700 underline">Ir para Configurações</a>
                </div>
              )}

              {/* ── Projeção de Atraso (aparece sempre que tem valores) ────── */}
              {valorBaseParcela > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock size={14} className="text-amber-500" />
                      <p className="text-sm font-semibold text-slate-900">Projeção de Atraso</p>
                    </div>
                    <p className="text-xs text-slate-500">
                      Regra {regraAtraso} ({regraAtraso === "A" ? "parcela" : "saldo"}) ·{" "}
                      {tipoTaxaAtr === "fixa" ? "1%/dia fixo" : `${taxaDiariaNum}${tipoValorAtr === "PERCENTUAL" ? "%" : " R$"}/dia`}
                      {diasCarenciaNum > 0 && ` · carência de ${diasCarenciaNum}d`}
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-4 py-2.5 text-left font-bold text-slate-500">Dias em atraso</th>
                          <th className="px-4 py-2.5 text-center font-bold text-slate-500">Cobrado?</th>
                          <th className="px-4 py-2.5 text-right font-bold text-red-500">Juro (Regra {regraAtraso})</th>
                          <th className="px-4 py-2.5 text-right font-bold text-slate-500">Total a receber</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {projecaoAtraso.map((p) => {
                          const juros = regraAtraso === "A" ? p.jurosA : p.jurosB;
                          const total = regraAtraso === "A" ? p.totalA : valorBaseParcela + p.jurosB;
                          const isDestaque = p.dias === diasAtrasoNum;
                          return (
                            <tr key={p.dias}
                              className={`${isDestaque ? "bg-blue-50 font-bold" : "hover:bg-slate-50"} transition-colors`}>
                              <td className="px-4 py-2.5 text-slate-700">
                                {p.dias} dia{p.dias > 1 ? "s" : ""}
                                {isDestaque && <span className="ml-1.5 text-[10px] text-blue-600 font-semibold">← selecionado</span>}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                {p.cobrando
                                  ? <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                                      <AlertTriangle size={8} /> Sim ({p.efetivos}d)
                                    </span>
                                  : <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                                      <CheckCircle2 size={8} /> Carência
                                    </span>
                                }
                              </td>
                              <td className={`px-4 py-2.5 text-right tabular-nums ${juros > 0 ? "text-red-600 font-semibold" : "text-slate-400"}`}>
                                {juros > 0 ? `+${formatarMoeda(juros)}` : "—"}
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold text-slate-900 tabular-nums">
                                {formatarMoeda(valorBaseParcela + juros)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Legenda das regras */}
                  <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 space-y-1.5">
                    <div className="flex gap-6 text-[10px] text-slate-500">
                      <div>
                        <span className="font-bold text-slate-700">Regra A — Parcela:</span>{" "}
                        base = {formatarMoeda(valorBaseParcela)} (valor da parcela)
                      </div>
                      <div>
                        <span className="font-bold text-slate-700">Regra B — Saldo:</span>{" "}
                        base = {formatarMoeda(saldoBaseB)} (capital devedor)
                      </div>
                    </div>
                    {!isPercentual && (
                      <p className="text-[10px] text-slate-400">
                        * Taxa em R$/dia — o valor cobrado não varia com o saldo. Regra A e B resultam no mesmo valor nominal.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2 h-full min-h-[300px]">
              <Calculator size={32} className="text-slate-300 shrink-0" />
              <p className="font-semibold text-slate-500 text-sm">Aguardando Parâmetros</p>
              <p>Preencha o valor do empréstimo e a taxa para ver a simulação.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Num({ label, value, onChange, step, min, max }: {
  label: string; value: number | ""; onChange: (v: number | "") => void; step?: number; min?: number; max?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      <input type="number" value={value === "" || value === undefined ? "" : String(Number(value))} step={step} min={min} max={max}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-500 transition-colors" />
    </div>
  );
}
