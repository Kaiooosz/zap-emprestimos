"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Calculator, HandCoins, FileCheck,
  ShoppingBag, Home, Tv, Receipt, Shield, FileText, Check,
} from "lucide-react";
import { formatarMoeda, formatarData } from "@/lib/utils";

// ─── Tipos de operação ────────────────────────────────────────────────────────

const TIPOS_OPERACAO = [
  { id: "EMPRESTIMO",      icon: HandCoins,  label: "Empréstimo Padrão",    desc: "Datas flexíveis, juros simples ou por parcela" },
  { id: "DIARIO",          icon: Calculator, label: "Empréstimo Diário",    desc: "Fluxo rápido — cobrança todos os dias" },
  { id: "DESCONTO_CHEQUE", icon: Receipt,    label: "Desconto de Cheque",   desc: "Cliente traz cheque pré-datado como garantia" },
  { id: "RENOVACAO",       icon: FileCheck,  label: "Renovação",            desc: "Renovar empréstimo existente com nova taxa" },
  { id: "VENDA",           icon: ShoppingBag,label: "Venda Parcelada",      desc: "Produto/veículo com custo e margem de lucro" },
  { id: "ALUGUEL",         icon: Home,       label: "Aluguel / Contrato",   desc: "Mensalidade recorrente sem data fim definida" },
  { id: "ASSINATURA",      icon: Tv,         label: "Assinatura",           desc: "Micro-recorrência com alerta de vencimento" },
];

type TipoOp = typeof TIPOS_OPERACAO[number]["id"];
type Periodo = "DIARIO" | "SEMANAL" | "QUINZENAL" | "MENSAL";
type Modalidade = "SIMPLES" | "POR_PARCELA";

function calcJuros(p: number, taxa: number, n: number, mod: Modalidade) {
  const r = taxa / 100;
  const totalJuros = p * r * n; // simples para ambas as modalidades no MVP
  const total = p + totalJuros;
  const parcela = total / n;
  return { totalJuros, total, parcela };
}

function gerarCalendario(n: number, inicio: string, intervalo: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(inicio);
    d.setDate(d.getDate() + intervalo * (i + 1));
    return d;
  });
}

const intervaloMap: Record<Periodo, number> = { DIARIO: 1, SEMANAL: 7, QUINZENAL: 15, MENSAL: 30 };

// ─── Componente ───────────────────────────────────────────────────────────────

export default function NovoEmprestimoPage() {
  const router      = useRouter();
  const searchParams= useSearchParams();
  const [step,      setStep]      = useState(0);   // 0=tipo, 1=dados, 2=garantias, 3=revisão
  const [loading,   setLoading]   = useState(false);
  const [clientes,  setClientes]  = useState<Array<{ id: string; nome: string; score: number; phone: string }>>([]);

  // Passo 0 — tipo
  const [tipoOp, setTipoOp] = useState<TipoOp>("EMPRESTIMO");

  // Passo 1 — dados (comuns)
  const [clienteId,   setClienteId]   = useState(searchParams.get("clienteId") ?? "");
  const [valor,       setValor]       = useState(2000);
  const [taxa,        setTaxa]        = useState(10);
  const [nParcelas,   setNParcelas]   = useState(6);
  const [periodo,     setPeriodo]     = useState<Periodo>("MENSAL");
  const [modalidade,  setModalidade]  = useState<Modalidade>("SIMPLES");
  const [dataInicio,  setDataInicio]  = useState(new Date().toISOString().split("T")[0]);
  const [obs,         setObs]         = useState("");

  // Desconto de cheque
  const [valorNominal, setValorNominal] = useState(1000);
  const [dataCheque,   setDataCheque]   = useState("");
  const [taxaDesconto, setTaxaDesconto] = useState(5);

  // Renovação
  const [empRenovarId,     setEmpRenovarId]     = useState("");
  const [taxaRenovacao,    setTaxaRenovacao]     = useState(3);
  const [parcelasAdicionais, setParcelasAdicionais] = useState(3);

  // Venda
  const [custo,       setCusto]       = useState(0);
  const [descProduto, setDescProduto] = useState("");

  // Aluguel / Assinatura
  const [valorMensal,  setValorMensal]  = useState(800);
  const [diaVencimento,setDiaVencimento]= useState(10);
  const [semDataFim,   setSemDataFim]   = useState(true);
  const [plano,        setPlano]        = useState("");

  // Passo 2 — garantias
  const [temGarantia,  setTemGarantia]  = useState(false);
  const [tipoGarantia, setTipoGarantia] = useState("IMOVEL");
  const [valorGarantia,setValorGarantia]= useState(0);
  const [temContrato,  setTemContrato]  = useState(false);

  // Simulação confirmada
  const [simOk, setSimOk] = useState(false);

  useEffect(() => {
    fetch("/api/clientes").then((r) => r.json()).then(setClientes);
  }, []);

  const dias      = intervaloMap[periodo];
  const simResult = useMemo(() => {
    if (tipoOp === "DESCONTO_CHEQUE") {
      const liquido = valorNominal * (1 - taxaDesconto / 100);
      return { total: valorNominal, totalJuros: valorNominal - liquido, parcela: valorNominal, liquido };
    }
    if (tipoOp === "ALUGUEL" || tipoOp === "ASSINATURA") {
      return { total: valorMensal * 12, totalJuros: 0, parcela: valorMensal, liquido: valorMensal };
    }
    const pBase = tipoOp === "VENDA" ? valor : valor;
    return calcJuros(pBase, taxa, nParcelas, modalidade);
  }, [tipoOp, valor, taxa, nParcelas, modalidade, valorNominal, taxaDesconto, valorMensal]);

  const calendario = useMemo(() => {
    const n = tipoOp === "DESCONTO_CHEQUE" ? 1 : tipoOp === "ALUGUEL" || tipoOp === "ASSINATURA" ? 12 : nParcelas;
    const d = tipoOp === "ALUGUEL" || tipoOp === "ASSINATURA" ? 30 : tipoOp === "DESCONTO_CHEQUE" ? 30 : dias;
    return gerarCalendario(n, dataInicio, d);
  }, [tipoOp, nParcelas, dataInicio, dias]);

  async function submit() {
    if (!clienteId) return alert("Selecione um cliente");
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        clienteId,
        tipoProduto: tipoOp === "DIARIO" ? "EMPRESTIMO" : tipoOp,
        tipo: tipoOp === "DIARIO" ? "DIARIO" : tipoOp === "ALUGUEL" || tipoOp === "ASSINATURA" ? "MENSAL" : periodo,
        modalidadeJuros: modalidade,
        valorPrincipal: tipoOp === "DESCONTO_CHEQUE" ? valorNominal * (1 - taxaDesconto / 100) : tipoOp === "ALUGUEL" || tipoOp === "ASSINATURA" ? valorMensal * 12 : valor,
        taxaJuros: tipoOp === "DESCONTO_CHEQUE" ? taxaDesconto : tipoOp === "ALUGUEL" || tipoOp === "ASSINATURA" ? 0 : taxa,
        numParcelas: tipoOp === "DESCONTO_CHEQUE" ? 1 : tipoOp === "ALUGUEL" || tipoOp === "ASSINATURA" ? 12 : nParcelas,
        dataInicio,
        observacoes: obs,
        temGarantia, tipoGarantia: temGarantia ? tipoGarantia : undefined,
        valorGarantia: temGarantia ? valorGarantia : undefined,
        temContrato,
        // tipo-specific
        valorNominalCheque: tipoOp === "DESCONTO_CHEQUE" ? valorNominal : undefined,
        dataCheque: tipoOp === "DESCONTO_CHEQUE" ? dataCheque : undefined,
        taxaRenovacao: tipoOp === "RENOVACAO" ? taxaRenovacao : undefined,
        custo: tipoOp === "VENDA" ? custo : undefined,
        descricaoProduto: tipoOp === "VENDA" ? descProduto : undefined,
        diaVencimento: (tipoOp === "ALUGUEL" || tipoOp === "ASSINATURA") ? diaVencimento : undefined,
        semDataFim: (tipoOp === "ALUGUEL" || tipoOp === "ASSINATURA") ? semDataFim : undefined,
      };

      const res = await fetch("/api/emprestimos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      router.push(`/emprestimos/${data.id}`);
    } catch {
      alert("Erro ao criar contrato");
    } finally {
      setLoading(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/emprestimos" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-slate-500 hover:text-white transition-colors">
          <ArrowLeft size={15} />
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-semibold text-slate-900 tracking-tight">Nova Operação de Crédito</h1>
          <p className="text-xs text-slate-500 mt-0.5">Empréstimo · Desconto de Cheque · Venda · Aluguel · Assinatura</p>
        </div>
        {/* Steps */}
        <div className="flex items-center gap-2">
          {["Tipo","Dados","Garantias","Revisão"].map((s, i) => (
            <div key={s} className={`flex items-center gap-1.5 ${i > 0 ? "ml-1" : ""}`}>
              {i > 0 && <div className="h-px w-4 bg-slate-100" />}
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all ${step === i ? "bg-slate-200 text-slate-900" : step > i ? "bg-slate-600 text-slate-100" : "bg-slate-100 text-slate-500"}`}>
                {step > i ? <Check size={11}/> : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${step === i ? "text-slate-200" : "text-slate-500"}`}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-4">

          {/* ── STEP 0: Tipo ── */}
          {step === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-900 mb-4">Que tipo de operação você quer registrar?</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {TIPOS_OPERACAO.map(({ id, icon: Icon, label, desc }) => (
                  <button key={id} onClick={() => setTipoOp(id as TipoOp)}
                    className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all ${tipoOp === id ? "bg-slate-50 border-slate-500" : "border-slate-200 hover:border-slate-600"}`}>
                    <Icon size={18} className={`mt-0.5 shrink-0 ${tipoOp === id ? "text-slate-200" : "text-slate-500"}`} />
                    <div>
                      <p className={`text-sm font-semibold ${tipoOp === id ? "text-slate-100" : "text-slate-400"}`}>{label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 1: Dados ── */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Cliente */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Cliente</p>
                <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-500">
                  <option value="">Selecione um cliente...</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome} — Score {c.score} — {c.phone}</option>)}
                </select>
                <div className="mt-2 text-right">
                  <Link href="/clientes/novo" className="text-xs text-slate-500 hover:text-slate-300 underline">+ Cadastrar novo cliente</Link>
                </div>
              </div>

              {/* Dados por tipo */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dados do Contrato</p>

                {/* EMPRESTIMO / DIARIO */}
                {(tipoOp === "EMPRESTIMO" || tipoOp === "DIARIO" || tipoOp === "RENOVACAO") && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <Num label="Valor Principal (R$)" value={valor} onChange={setValor} step={100} min={100} />
                      <Num label="Taxa de Juros (%)" value={taxa} onChange={setTaxa} step={0.5} min={0.1} />
                      <Num label="Número de Parcelas" value={nParcelas} onChange={setNParcelas} step={1} min={1} />
                      <Inp label="Data de Início" value={dataInicio} onChange={setDataInicio} type="date" />
                    </div>

                    {tipoOp !== "DIARIO" && (
                      <div>
                        <p className="text-xs font-medium text-slate-400 mb-1.5">Periodicidade</p>
                        <div className="grid grid-cols-4 gap-1.5">
                          {(["DIARIO","SEMANAL","QUINZENAL","MENSAL"] as Periodo[]).map((p) => (
                            <button key={p} type="button" onClick={() => setPeriodo(p)}
                              className={`rounded-xl py-2 text-xs font-medium border transition-all ${periodo === p ? "bg-slate-50 border-slate-500 text-slate-100" : "border-slate-200 text-slate-500 hover:border-slate-600"}`}>
                              {p === "DIARIO" ? "Diário" : p === "SEMANAL" ? "Semanal" : p === "QUINZENAL" ? "Quinzenal" : "Mensal"}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-medium text-slate-400 mb-1.5">Modalidade de Juros</p>
                      <div className="grid grid-cols-2 gap-2">
                        {([["SIMPLES","Juros Simples","Taxa sobre o montante total"],["POR_PARCELA","Juros por Parcela","Taxa aplicada em cada parcela"]] as const).map(([v,l,d]) => (
                          <button key={v} type="button" onClick={() => setModalidade(v)}
                            className={`flex flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-all ${modalidade === v ? "bg-slate-50 border-slate-500" : "border-slate-200 hover:border-slate-600"}`}>
                            <span className={`text-xs font-semibold ${modalidade === v ? "text-slate-100" : "text-slate-400"}`}>{l}</span>
                            <span className="text-xs text-slate-600 mt-0.5">{d}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {tipoOp === "RENOVACAO" && (
                      <div className="border-t border-slate-200 pt-4 grid grid-cols-2 gap-4">
                        <Num label="Taxa de Renovação (%)" value={taxaRenovacao} onChange={setTaxaRenovacao} step={0.5} min={0} />
                        <Num label="Parcelas Adicionais" value={parcelasAdicionais} onChange={setParcelasAdicionais} step={1} min={1} />
                      </div>
                    )}
                  </>
                )}

                {/* DESCONTO DE CHEQUE */}
                {tipoOp === "DESCONTO_CHEQUE" && (
                  <div className="grid grid-cols-2 gap-4">
                    <Num label="Valor Nominal do Cheque (R$)" value={valorNominal} onChange={setValorNominal} step={100} min={100} />
                    <Num label="Taxa de Desconto (%)" value={taxaDesconto} onChange={setTaxaDesconto} step={0.5} min={0.1} />
                    <Inp label="Data do Cheque" value={dataCheque} onChange={setDataCheque} type="date" />
                    <Inp label="Data de Início" value={dataInicio} onChange={setDataInicio} type="date" />
                    <div className="col-span-2 rounded-xl bg-white border border-slate-200 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Valor líquido entregue ao cliente</span>
                        <span className="text-lg font-bold text-slate-900">{formatarMoeda(valorNominal * (1 - taxaDesconto / 100))}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-slate-500">Desconto (seu lucro)</span>
                        <span className="text-sm font-semibold text-emerald-400">{formatarMoeda(valorNominal * taxaDesconto / 100)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* VENDA */}
                {tipoOp === "VENDA" && (
                  <>
                    <Inp label="Produto / Descrição *" value={descProduto} onChange={setDescProduto} placeholder="Ex: Honda Biz 2023, Notebook Dell..." />
                    <div className="grid grid-cols-2 gap-4">
                      <Num label="Custo do Produto (R$)" value={custo} onChange={setCusto} step={100} min={0} />
                      <Num label="Preço de Venda (R$)" value={valor} onChange={setValor} step={100} min={0} />
                      <Num label="Taxa de Juros (%)" value={taxa} onChange={setTaxa} step={0.5} min={0} />
                      <Num label="Número de Parcelas" value={nParcelas} onChange={setNParcelas} step={1} min={1} />
                      <Inp label="Data de Início" value={dataInicio} onChange={setDataInicio} type="date" />
                    </div>
                    {custo > 0 && valor > 0 && (
                      <div className="rounded-xl bg-white border border-slate-200 p-4 grid grid-cols-2 gap-3">
                        <div><p className="text-xs text-slate-500">Custo</p><p className="font-semibold text-slate-900">{formatarMoeda(custo)}</p></div>
                        <div><p className="text-xs text-slate-500">Lucro bruto</p><p className="font-semibold text-emerald-400">{formatarMoeda(valor - custo)}</p></div>
                        <div><p className="text-xs text-slate-500">Margem</p><p className="font-semibold text-slate-900">{custo > 0 ? ((valor - custo) / custo * 100).toFixed(1) : 0}%</p></div>
                        <div><p className="text-xs text-slate-500">Total c/ juros</p><p className="font-semibold text-slate-900">{formatarMoeda(simResult.total)}</p></div>
                      </div>
                    )}
                  </>
                )}

                {/* ALUGUEL / ASSINATURA */}
                {(tipoOp === "ALUGUEL" || tipoOp === "ASSINATURA") && (
                  <div className="grid grid-cols-2 gap-4">
                    {tipoOp === "ASSINATURA" && (
                      <div className="col-span-2">
                        <Inp label="Plano / Descrição" value={plano} onChange={setPlano} placeholder="Ex: Premium, Basic..." />
                      </div>
                    )}
                    <Num label="Valor Mensal (R$)" value={valorMensal} onChange={setValorMensal} step={50} min={1} />
                    <Num label="Dia de Vencimento" value={diaVencimento} onChange={setDiaVencimento} min={1} max={31} />
                    <Inp label="Data de Início" value={dataInicio} onChange={setDataInicio} type="date" />
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSemDataFim(!semDataFim)}>
                      <Toggle active={semDataFim} />
                      <div>
                        <p className="text-sm text-slate-300 font-medium">Sem data de fim</p>
                        <p className="text-xs text-slate-500">Contrato indeterminado</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Observações — sempre */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Observações</label>
                  <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-600 focus:outline-none focus:border-slate-500 resize-none"
                    placeholder="Anotações sobre o contrato..." />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Garantias ── */}
          {step === 2 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Garantias e Contrato</p>

              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-600 cursor-pointer" onClick={() => setTemContrato(!temContrato)}>
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-200">Contrato Formal Assinado</p>
                    <p className="text-xs text-slate-500">Contrato com validade jurídica será gerado</p>
                  </div>
                </div>
                <Toggle active={temContrato} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-600 cursor-pointer" onClick={() => setTemGarantia(!temGarantia)}>
                <div className="flex items-center gap-3">
                  <Shield size={16} className="text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-200">Deixou Garantia</p>
                    <p className="text-xs text-slate-500">Imóvel, veículo, cheque, nota promissória ou fiador</p>
                  </div>
                </div>
                <Toggle active={temGarantia} />
              </div>

              {temGarantia && (
                <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-slate-200">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Tipo de Garantia</label>
                    <select value={tipoGarantia} onChange={(e) => setTipoGarantia(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-500">
                      {[["IMOVEL","Imóvel"],["VEICULO","Veículo"],["CHEQUE","Cheque"],["NOTA_PROMISSORIA","Nota Promissória"],["FIADOR","Fiador"],["OUTRO","Outro"]].map(([v,l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <Num label="Valor da Garantia (R$)" value={valorGarantia} onChange={setValorGarantia} step={1000} min={0} />
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Revisão ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Resumo do Contrato</p>
                {[
                  ["Tipo de Operação", TIPOS_OPERACAO.find((t) => t.id === tipoOp)?.label ?? tipoOp],
                  ["Cliente", clientes.find((c) => c.id === clienteId)?.nome ?? "—"],
                  ["Valor Principal", formatarMoeda(tipoOp === "DESCONTO_CHEQUE" ? valorNominal * (1 - taxaDesconto / 100) : tipoOp === "ALUGUEL" || tipoOp === "ASSINATURA" ? valorMensal : valor)],
                  ["Total com Juros", formatarMoeda(simResult.total)],
                  ["Parcelas", tipoOp === "DESCONTO_CHEQUE" ? "1x" : `${nParcelas}x de ${formatarMoeda(simResult.parcela)}`],
                  ["Contrato formal", temContrato ? "Sim" : "Não"],
                  ["Garantia", temGarantia ? `Sim — ${tipoGarantia}` : "Não"],
                ].map(([l, v]) => (
                  <div key={l} className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{l}</span>
                    <span className="text-sm font-semibold text-slate-900">{v}</span>
                  </div>
                ))}
              </div>

              {/* Simulação obrigatória */}
              {!simOk && (
                <div className="rounded-2xl border border-amber-800/50 bg-amber-900/10 p-4 flex items-center gap-3">
                  <Calculator size={16} className="text-amber-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-amber-300 font-medium">Confirme a simulação</p>
                    <p className="text-xs text-amber-500 mt-0.5">Verifique o calendário de parcelas à direita antes de confirmar</p>
                  </div>
                  <button onClick={() => setSimOk(true)} className="rounded-lg bg-amber-800/30 border border-amber-700 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-800/50">
                    Confirmar
                  </button>
                </div>
              )}

              <button onClick={submit} disabled={loading || !simOk || !clienteId}
                className="w-full rounded-xl border border-blue-700 bg-blue-700 py-3.5 text-sm font-bold text-slate-200 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {loading ? "Criando contrato..." : "Criar Contrato"}
              </button>
            </div>
          )}

          {/* Navegação entre steps */}
          <div className="flex items-center justify-between pt-2">
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-400 hover:text-slate-200 hover:border-slate-600 disabled:opacity-0 transition-all">
              <ArrowLeft size={14}/> Voltar
            </button>
            {step < 3 && (
              <button onClick={() => { setStep((s) => s + 1); setSimOk(false); }}
                className="flex items-center gap-1.5 rounded-xl border border-blue-700 bg-blue-700 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-blue-800 transition-colors">
                Próximo <ArrowRight size={14}/>
              </button>
            )}
          </div>
        </div>

        {/* Simulador ao vivo */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calculator size={15} className="text-slate-400" />
              <p className="text-sm font-semibold text-slate-900">Simulador ao Vivo</p>
            </div>
            <div className="space-y-2.5">
              {[
                ["Principal",    formatarMoeda(tipoOp === "DESCONTO_CHEQUE" ? valorNominal * (1 - taxaDesconto / 100) : tipoOp === "ALUGUEL" || tipoOp === "ASSINATURA" ? valorMensal : valor)],
                ["Total Juros",  formatarMoeda(simResult.totalJuros)],
                ["Total",        formatarMoeda(simResult.total)],
                ["Parcela",      tipoOp === "DESCONTO_CHEQUE" ? "1x" : `${calendario.length}x ${formatarMoeda(simResult.parcela)}`],
              ].map(([l, v]) => (
                <div key={l} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{l}</span>
                  <span className="text-sm font-semibold text-slate-900">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Calendário de vencimentos */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden max-h-80 overflow-y-auto">
            <div className="px-4 py-3 border-b border-slate-200 sticky top-0 bg-white">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vencimentos</p>
            </div>
            <div className="divide-y divide-[#152035]/50">
              {calendario.map((d, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400">{i + 1}</span>
                    <span className="text-xs text-slate-400">{d.toLocaleDateString("pt-BR")}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{formatarMoeda(simResult.parcela)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Num({ label, value, onChange, step = 1, min, max }: {
  label: string; value: number; onChange: (v: number) => void;
  step?: number; min?: number; max?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      <input type="number" value={value} step={step} min={min} max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors" />
    </div>
  );
}

function Inp({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-600 focus:outline-none focus:border-slate-500 transition-colors" />
    </div>
  );
}

function Toggle({ active }: { active: boolean }) {
  return (
    <div className={`relative h-5 w-9 rounded-full transition-colors shrink-0 ${active ? "bg-slate-400" : "bg-slate-700"}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${active ? "left-4" : "left-0.5"}`} />
    </div>
  );
}
