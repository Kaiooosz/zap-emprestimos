"use client";

import { useState, useMemo } from "react";
import { Calculator, Info } from "lucide-react";
import { formatarMoeda, formatarData } from "@/lib/utils";
import { storeExt } from "@/lib/store";

type TipoJuros = "simples" | "composto" | "price" | "parcelado";
type Periodo = "DIARIO" | "SEMANAL" | "QUINZENAL" | "MENSAL";

const periodMap: Record<Periodo, { label: string; dias: number }> = {
  DIARIO:    { label: "Diário",    dias: 1  },
  SEMANAL:   { label: "Semanal",  dias: 7  },
  QUINZENAL: { label: "Quinzenal",dias: 15 },
  MENSAL:    { label: "Mensal",   dias: 30 },
};

function calcular(
  principal: number, taxa: number, n: number,
  tipo: TipoJuros, entrada: number,
  taxasParcelamento: Record<number, number>
) {
  const p = principal - entrada;
  const r = taxa / 100;
  if (tipo === "parcelado") {
    const taxaPct = taxasParcelamento[n] ?? 0;
    const total   = p * (1 + taxaPct / 100);
    return { total, totalJuros: total - p, parcela: total / n, taxaUsada: taxaPct };
  }
  if (tipo === "simples") {
    const total = p * (1 + r * n);
    return { total, totalJuros: total - p, parcela: total / n, taxaUsada: taxa };
  }
  if (tipo === "composto") {
    const total = p * Math.pow(1 + r, n);
    return { total, totalJuros: total - p, parcela: total / n, taxaUsada: taxa };
  }
  if (r === 0) return { total: p, totalJuros: 0, parcela: p / n, taxaUsada: 0 };
  const parc = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return { total: parc * n, totalJuros: parc * n - p, parcela: parc, taxaUsada: taxa };
}

function gerarTabela(
  principal: number, taxa: number, n: number,
  tipo: TipoJuros, entrada: number,
  dataInicio: Date, dias: number,
  taxasParcelamento: Record<number, number>
) {
  const p = principal - entrada;
  const r = taxa / 100;
  return Array.from({ length: n }, (_, idx) => {
    const i = idx + 1;
    const venc = new Date(dataInicio);
    venc.setDate(venc.getDate() + dias * i);
    let parcela = 0, juros = 0, amortizacao = 0, saldo = 0;

    if (tipo === "parcelado") {
      const taxaPct = taxasParcelamento[n] ?? 0;
      const total   = p * (1 + taxaPct / 100);
      parcela = total / n;
      juros = (p * taxaPct / 100) / n;
      amortizacao = p / n;
      saldo = Math.max(0, p - amortizacao * i);
    } else if (tipo === "simples") {
      parcela = p * (1 + r * n) / n;
      juros = p * r;
      amortizacao = p / n;
      saldo = Math.max(0, p - amortizacao * i);
    } else if (tipo === "composto") {
      parcela = p * Math.pow(1 + r, n) / n;
      juros = p * (Math.pow(1 + r, i) - Math.pow(1 + r, i - 1));
      amortizacao = parcela - juros;
      saldo = Math.max(0, p - amortizacao * i);
    } else {
      if (r === 0) { parcela = p / n; juros = 0; amortizacao = parcela; saldo = Math.max(0, p - i * amortizacao); }
      else {
        parcela = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        const saldoAnt = i === 1 ? p : p * Math.pow(1 + r, i - 1) - parcela * ((Math.pow(1 + r, i - 1) - 1) / r);
        juros = saldoAnt * r;
        amortizacao = parcela - juros;
        saldo = Math.max(0, saldoAnt - amortizacao);
      }
    }
    return { numero: i, parcela, juros, amortizacao, saldo, dataVencimento: venc };
  });
}

export default function SimuladorPage() {
  const taxasParcelamento = storeExt.config.getTaxasParcelamento();

  const [principal, setPrincipal] = useState(5000);
  const [entrada,   setEntrada]   = useState(0);
  const [taxa,      setTaxa]      = useState(10);
  const [n,         setN]         = useState(6);
  const [tipo,      setTipo]      = useState<TipoJuros>("simples");
  const [period,    setPeriod]    = useState<Periodo>("MENSAL");
  const [dataInicio,setData]      = useState(new Date().toISOString().split("T")[0]);
  const [tabVis,    setTabVis]    = useState(false);

  const { dias } = periodMap[period];
  const res   = useMemo(() => calcular(principal, taxa, n, tipo, entrada, taxasParcelamento), [principal, taxa, n, tipo, entrada, taxasParcelamento]);
  const tabela = useMemo(() => gerarTabela(principal, taxa, n, tipo, entrada, new Date(dataInicio), dias, taxasParcelamento), [principal, taxa, n, tipo, entrada, dataInicio, dias, taxasParcelamento]);
  const cet   = useMemo(() => {
    if (tipo === "parcelado") {
      const taxaPct = taxasParcelamento[n] ?? 0;
      return (taxaPct / n) * 12;
    }
    const r = taxa / 100;
    return tipo === "price" ? (Math.pow(1+r, 12/(dias/30))-1)*100 : r*(12/(dias/30))*100;
  }, [taxa, tipo, dias, n, taxasParcelamento]);

  const isParcelado = tipo === "parcelado";
  const taxaParcelado = isParcelado ? (taxasParcelamento[n] ?? 0) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Calculator size={20} className="text-slate-400" />
        <div>
          <h1 className="text-base font-semibold text-slate-900 tracking-tight">Simulador de Empréstimos</h1>
          <p className="text-xs text-slate-500 mt-0.5">Calcule parcelas, juros e CET antes de formalizar o contrato</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Parâmetros */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-900">Parâmetros</p>
          <Num label="Valor Principal (R$)" value={principal} onChange={setPrincipal} step={100} min={100}/>
          <Num label="Entrada / Sinal (R$)" value={entrada} onChange={setEntrada} step={100} min={0}/>

          {!isParcelado && (
            <Num label={`Taxa (% / ${periodMap[period].label.toLowerCase()})`} value={taxa} onChange={setTaxa} step={0.5} min={0.1}/>
          )}

          <Num label="Número de Parcelas" value={n} onChange={setN} step={1} min={2} max={isParcelado ? 10 : 360}/>

          {/* Aviso taxa parcelado */}
          {isParcelado && (
            <div className={`rounded-xl border px-3 py-2.5 ${taxaParcelado !== null && taxaParcelado > 0 ? "border-blue-200 bg-blue-50" : "border-amber-200 bg-amber-50"}`}>
              {taxaParcelado !== null && taxaParcelado > 0 ? (
                <p className="text-xs text-blue-700 font-medium">
                  Taxa para {n}x: <span className="font-bold">{taxaParcelado}%</span> sobre o principal
                </p>
              ) : (
                <p className="text-xs text-amber-700">Taxa para {n}x não configurada. Acesse Configurações.</p>
              )}
            </div>
          )}

          {!isParcelado && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Data de Início</label>
              <input type="date" value={dataInicio} onChange={(e) => setData(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-500"/>
            </div>
          )}

          {isParcelado && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Data de Início</label>
              <input type="date" value={dataInicio} onChange={(e) => setData(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-500"/>
            </div>
          )}

          {!isParcelado && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Periodicidade</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(periodMap) as Periodo[]).map((p) => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className={`rounded-xl py-2 text-xs font-medium border transition-all ${period===p ? "bg-slate-900 border-slate-900 text-white" : "border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700"}`}>
                    {periodMap[p].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Modalidade de Cálculo</label>
            <div className="space-y-1.5">
              {([
                ["simples",   "Juros Simples",  "Taxa flat sobre o principal"],
                ["composto",  "Juros Composto", "Juros sobre saldo devedor"],
                ["price",     "Tabela Price",   "Parcelas iguais — SAC Francês"],
                ["parcelado", "Parcelado",      "Taxa fixa por nº de parcelas (tabela)"],
              ] as const).map(([v,l,d]) => (
                <button key={v} onClick={() => setTipo(v)}
                  className={`w-full flex items-start gap-2 rounded-xl border px-3 py-2 text-left transition-all ${tipo===v ? "bg-slate-50 border-slate-900" : "border-slate-200 hover:border-slate-400"}`}>
                  <div className={`mt-0.5 h-3.5 w-3.5 rounded-full border-2 shrink-0 ${tipo===v ? "border-slate-900 bg-slate-900" : "border-slate-400"}`}/>
                  <div>
                    <p className={`text-xs font-semibold ${tipo===v ? "text-slate-900" : "text-slate-500"}`}>{l}</p>
                    <p className="text-xs text-slate-500">{d}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Tabela de taxas parcelado — exibida quando selecionado */}
          {isParcelado && (
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Tabela de Taxas</p>
              <div className="grid grid-cols-3 gap-1">
                {Object.entries(taxasParcelamento)
                  .sort(([a],[b]) => Number(a)-Number(b))
                  .map(([parcelas, pct]) => (
                    <div key={parcelas}
                      className={`rounded-lg px-2 py-1.5 text-center border transition-all ${Number(parcelas) === n ? "bg-slate-900 border-slate-900" : "border-slate-100 bg-slate-50"}`}>
                      <p className={`text-[10px] font-semibold ${Number(parcelas) === n ? "text-white" : "text-slate-500"}`}>{parcelas}x</p>
                      <p className={`text-xs font-bold ${Number(parcelas) === n ? "text-white" : "text-slate-700"}`}>{pct}%</p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Resultados */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Valor Financiado", formatarMoeda(principal - entrada)],
              ["Total de Juros",   formatarMoeda(res.totalJuros)],
              ["Valor Total",      formatarMoeda(res.total)],
              ["CET Anual",        `${cet.toFixed(1)}%`],
            ].map(([l, v]) => (
              <div key={l} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium text-slate-500">{l}</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5">{v}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Parcela Estimada</p>
              <p className="text-2xl font-black text-slate-900">{formatarMoeda(res.parcela)}</p>
            </div>
            {entrada > 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Info size={12}/>
                Entrada de {formatarMoeda(entrada)} + {n}x de {formatarMoeda(res.parcela)}
              </div>
            )}
            <div className="h-px bg-slate-100"/>
            {[
              ["Principal",               formatarMoeda(principal)],
              ["Entrada",                 formatarMoeda(entrada)],
              ["Financiado",              formatarMoeda(principal - entrada)],
              [isParcelado ? `Taxa parcelado (${taxaParcelado}%)` : `Juros (${tipo})`, formatarMoeda(res.totalJuros)],
              ["Total",                   formatarMoeda(res.total)],
            ].map(([l, v]) => (
              <div key={l} className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{l}</span>
                <span className="text-sm font-semibold text-slate-900">{v}</span>
              </div>
            ))}
            <a href={`/emprestimos/novo?principal=${principal}&taxa=${taxa}&parcelas=${n}&tipo=${period}`}
              className="block w-full text-center rounded-xl border border-blue-700 bg-blue-700 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors mt-2">
              Criar Contrato com estes Dados
            </a>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-400">Tabela de Amortização</p>
            <button onClick={() => setTabVis(!tabVis)} className="text-xs text-slate-500 hover:text-slate-700 underline">
              {tabVis ? "Ocultar" : "Exibir"} tabela completa
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50/80">
                <tr className="border-b border-slate-200">
                  {["#","Vencimento","Parcela","Juros","Amortização","Saldo"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(tabVis ? tabela : tabela.slice(0, 6)).map((row) => (
                  <tr key={row.numero} className="hover:bg-slate-50/80">
                    <td className="px-4 py-2.5 text-slate-400">{row.numero}</td>
                    <td className="px-4 py-2.5 text-slate-400">{formatarData(row.dataVencimento)}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">{formatarMoeda(row.parcela)}</td>
                    <td className="px-4 py-2.5 text-red-500">{formatarMoeda(row.juros)}</td>
                    <td className="px-4 py-2.5 text-slate-400">{formatarMoeda(row.amortizacao)}</td>
                    <td className="px-4 py-2.5 text-slate-400">{formatarMoeda(row.saldo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Num({ label, value, onChange, step, min, max }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      <input type="number" value={value} step={step} min={min} max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-500 transition-colors"/>
    </div>
  );
}
