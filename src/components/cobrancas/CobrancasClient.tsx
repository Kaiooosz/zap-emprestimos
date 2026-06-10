"use client";

import { useState, useMemo } from "react";
import { MessageSquare, Send, Filter, CheckSquare, Square, AlertTriangle, Clock, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";
import { TemplateMsg } from "@/lib/store";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { formatarMoeda, formatarData } from "@/lib/utils";

interface Pendente {
  id: string;
  parcelaNum: number;
  totalParcelas: number;
  clienteId: string;
  clienteNome: string;
  clientePhone: string;
  score: number;
  valorDevido: number;
  valorPago: number;        // valor já pago na parcela (para regra B)
  dataVencimento: string;
  status: string;
  diasAtraso: number;
  emprestimoId: string;
}

interface Props {
  pendentes: Pendente[];
  templates: TemplateMsg[];
  empresaNome: string;
  empresaTelefone: string;
  whatsappStatus: "CONECTADO" | "DESCONECTADO" | "NAO_CONFIGURADO";
  regraAtraso: "A" | "B";   // A = parcela inteira, B = saldo restante
  taxaDiaria: number;        // % por dia, ex: 1
}

function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export function CobrancasClient({ pendentes, templates, empresaNome, empresaTelefone, whatsappStatus, regraAtraso, taxaDiaria }: Props) {
  const [filtro, setFiltro]         = useState<"todos" | "atrasado" | "pendente">("todos");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [preview, setPreview]       = useState<Pendente | null>(null);
  const [disparando, setDisparando] = useState(false);
  const [disparados, setDisparados] = useState<Set<string>>(new Set());

  /** Calcula juros de atraso respeitando a regra do perfil */
  function calcJuros(p: Pendente): number {
    if (p.diasAtraso <= 0) return 0;
    const base = regraAtraso === "A"
      ? p.valorDevido                                          // Regra A: parcela inteira
      : Math.max(0, p.valorDevido - (p.valorPago ?? 0));      // Regra B: saldo restante
    return Number((base * p.diasAtraso * taxaDiaria / 100).toFixed(2));
  }

  const lista = useMemo(() =>
    pendentes.filter((p) => filtro === "todos" || p.status === filtro.toUpperCase()),
    [pendentes, filtro]
  );

  const template = templates.find((t) => t.id === templateId);

  function getVars(p: Pendente): Record<string, string> {
    const juros = calcJuros(p);
    return {
      nome:             p.clienteNome,
      numero:           String(p.parcelaNum),
      valor:            formatarMoeda(p.valorDevido + juros),
      vencimento:       formatarData(p.dataVencimento),
      dias_atraso:      String(p.diasAtraso),
      telefone_empresa: empresaTelefone,
      empresa:          empresaNome,
      juros_atraso:     formatarMoeda(juros),
      regra_juros:      `Regra ${regraAtraso} (${taxaDiaria}%/dia)`,
    };
  }

  function toggleSel(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleTodos() {
    setSelecionados((prev) =>
      prev.size === lista.length ? new Set() : new Set(lista.map((p) => p.id))
    );
  }

  async function disparar() {
    if (!selecionados.size || !template) return;
    setDisparando(true);
    // Simula disparo (em prod: POST /api/whatsapp/disparar)
    await new Promise((r) => setTimeout(r, 1500));
    setDisparados((prev) => new Set([...prev, ...selecionados]));
    setSelecionados(new Set());
    setDisparando(false);
  }

  const atrasados = pendentes.filter((p) => p.status === "ATRASADO").length;
  const pendenteCount = pendentes.filter((p) => p.status === "PENDENTE").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <MessageSquare size={20} className="text-slate-400" />
          <div>
            <h1 className="text-base font-semibold text-slate-900 tracking-tight">Disparos de Cobrança</h1>
            <p className="text-xs text-slate-500 mt-0.5">{atrasados} atrasadas · {pendenteCount} pendentes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Status WhatsApp */}
          <div className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
            whatsappStatus === "CONECTADO"
              ? "border-emerald-800 bg-emerald-900/20 text-emerald-400"
              : "border-red-800 bg-red-900/20 text-red-400"
          }`}>
            {whatsappStatus === "CONECTADO" ? <Wifi size={12}/> : <WifiOff size={12}/>}
            WhatsApp: {whatsappStatus === "CONECTADO" ? "Conectado" : whatsappStatus === "DESCONECTADO" ? "Desconectado" : "Não configurado"}
          </div>
          <Link href="/configuracoes" className="text-xs text-slate-500 hover:text-slate-700 underline">Configurar</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Lista de parcelas */}
        <div className="lg:col-span-2 space-y-3">
          {/* Filtros + Template */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 gap-0.5">
              {[["todos","Todos"],["atrasado","Atrasados"],["pendente","Pendentes"]].map(([v,l]) => (
                <button key={v} onClick={() => setFiltro(v as any)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${filtro===v ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700"}`}>
                  {l}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-slate-500"
              >
                {templates.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
              <button
                onClick={disparar}
                disabled={!selecionados.size || disparando || whatsappStatus !== "CONECTADO"}
                className="flex items-center gap-1.5 rounded-lg border border-blue-700 bg-blue-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={12}/>
                {disparando ? "Disparando..." : `Disparar (${selecionados.size})`}
              </button>
            </div>
          </div>

          {/* Tabela */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center gap-3 px-3 sm:px-5 py-3 border-b border-slate-200 bg-slate-50/80">
              <button onClick={toggleTodos} className="text-slate-500 hover:text-slate-700">
                {selecionados.size === lista.length && lista.length > 0
                  ? <CheckSquare size={15}/>
                  : <Square size={15}/>}
              </button>
              <span className="text-xs text-slate-500">{selecionados.size} selecionados</span>
            </div>

            {lista.length === 0 ? (
              <p className="text-sm text-slate-600 text-center py-12">Nenhuma cobrança para exibir</p>
            ) : (
              <div className="divide-y divide-[#152035]/60">
                {lista.map((p) => (
                  <div key={p.id}
                    onClick={() => setPreview(p)}
                    className={`flex items-center gap-2.5 px-3 sm:px-5 py-3 cursor-pointer transition-colors ${
                      preview?.id === p.id ? "bg-slate-50" :
                      disparados.has(p.id) ? "opacity-40" :
                      "hover:bg-slate-50/80"
                    }`}
                  >
                    <button onClick={(e) => { e.stopPropagation(); toggleSel(p.id); }} className="text-slate-500 hover:text-slate-700 shrink-0">
                      {selecionados.has(p.id) ? <CheckSquare size={15} className="text-blue-700"/> : <Square size={15}/>}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-slate-900 truncate">{p.clienteNome}</p>
                        {disparados.has(p.id) && <span className="text-xs text-emerald-500 shrink-0">Enviado</span>}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <ScoreBadge score={p.score}/>
                        <span className="text-xs text-slate-500 tabular-nums">{p.clientePhone}</span>
                      </div>
                      {p.diasAtraso > 0 && (() => {
                        const juros = calcJuros(p);
                        return (
                          <div className="mt-1 flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-red-500 font-medium">
                              Juros (Regra {regraAtraso}): +{formatarMoeda(juros)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Total: {formatarMoeda(p.valorDevido + juros)}
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="text-right shrink-0 space-y-1">
                      <p className="text-sm font-bold text-slate-900 tabular-nums">{formatarMoeda(p.valorDevido)}</p>
                      <StatusBadge status={p.status as any}/>
                    </div>

                    <div className="text-right shrink-0 hidden sm:block">
                      {p.diasAtraso > 0 ? (
                        <div className="flex items-center gap-1 text-xs text-red-400">
                          <AlertTriangle size={11}/>
                          {p.diasAtraso}d atraso
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock size={11}/>
                          {formatarData(p.dataVencimento)}
                        </div>
                      )}
                      <p className="text-xs text-slate-500 mt-0.5">Parcela {p.parcelaNum}/{p.totalParcelas}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Preview da mensagem */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-900">Preview da Mensagem</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {preview ? `Para: ${preview.clienteNome}` : "Clique em um cliente para ver"}
              </p>
            </div>

            {template && preview ? (
              <div className="p-4">
                {/* Bolha de WhatsApp */}
                <div className="rounded-2xl rounded-tl-none bg-slate-50 border border-slate-200 p-4 max-w-xs">
                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {renderTemplate(template.conteudo, getVars(preview))}
                  </p>
                  <p className="text-xs text-slate-600 mt-2 text-right">
                    {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>

                <button
                  onClick={() => { setSelecionados(new Set([preview.id])); }}
                  className="mt-3 w-full rounded-lg border border-blue-700 bg-blue-700 py-2 text-xs font-semibold text-white hover:bg-blue-800 transition-colors"
                >
                  Selecionar este cliente
                </button>
              </div>
            ) : (
              <div className="p-5 text-center text-slate-600 text-xs py-8">
                Selecione um template e clique em um cliente
              </div>
            )}
          </div>

          {/* Variáveis disponíveis */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Variáveis do Template</p>
            <div className="space-y-1.5">
              {[
                ["{{nome}}",             "Nome do cliente"],
                ["{{numero}}",           "Número da parcela"],
                ["{{valor}}",            "Valor devido"],
                ["{{vencimento}}",       "Data de vencimento"],
                ["{{dias_atraso}}",      "Dias em atraso"],
                ["{{telefone_empresa}}", "Telefone da empresa"],
              ].map(([v, d]) => (
                <div key={v} className="flex items-center justify-between">
                  <code className="text-xs text-blue-700 font-mono">{v}</code>
                  <span className="text-xs text-slate-600">{d}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200">
              <Link href="/configuracoes?tab=templates" className="text-xs text-slate-400 hover:text-blue-700 underline">
                Editar templates
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
