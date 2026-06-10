"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  MessageSquare, Send, CheckSquare, Square, AlertTriangle, 
  Clock, Wifi, WifiOff, Bell, Save, Loader2, ArrowLeft,
  ChevronLeft, ChevronRight, FileText, CheckCircle
} from "lucide-react";
import Link from "next/link";
import { TemplateMsg } from "@/lib/store";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { formatarMoeda, formatarData } from "@/lib/utils";

type Tab = "disparos" | "notificacoes" | "templates";

interface Pendente {
  id: string;
  parcelaNum: number;
  totalParcelas: number;
  clienteId: string;
  clienteNome: string;
  clientePhone: string;
  score: number;
  valorDevido: number;
  valorPago: number;
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
  regraAtraso: "A" | "B";
  taxaDiaria: number;
}

// Interfaces de Notificações
interface ConfigNotificacao {
  ativo:      boolean;
  horario:    string | null;
  templateId: string | null;
}

interface ConfigNotificacoes {
  resumoDiario:        ConfigNotificacao;
  relatorioCobrancas:  ConfigNotificacao;
  lembreteManhaAlt:    ConfigNotificacao;
  bemVindas:           ConfigNotificacao;
  lembrete3dias:       ConfigNotificacao;
  confirmacaoQuitacao: ConfigNotificacao;
}

const NOTIF_DEFAULTS: ConfigNotificacoes = {
  resumoDiario:        { ativo: false, horario: "07:00", templateId: null },
  relatorioCobrancas:  { ativo: false, horario: "08:00", templateId: null },
  lembreteManhaAlt:    { ativo: false, horario: "12:00", templateId: null },
  bemVindas:           { ativo: false, horario: null,    templateId: null },
  lembrete3dias:       { ativo: false, horario: "09:00", templateId: null },
  confirmacaoQuitacao: { ativo: false, horario: null,    templateId: null },
};

const NOTIF_META: Record<keyof ConfigNotificacoes, { label: string; desc: string; temHorario: boolean }> = {
  resumoDiario:        { label: "Resumo diário",             desc: "Visão geral de vencimentos do dia",              temHorario: true },
  relatorioCobrancas:  { label: "Relatório de cobranças",    desc: "Lista de parcelas atrasadas",                    temHorario: true },
  lembreteManhaAlt:    { label: "Lembrete alternativo",      desc: "Parcelas não cobradas pela manhã",               temHorario: true },
  bemVindas:           { label: "Boas-vindas ao contrato",   desc: "Enviado ao criar empréstimo — imediato",         temHorario: false },
  lembrete3dias:       { label: "Lembrete 3 dias antes",     desc: "Alerta antecipado de vencimento",                temHorario: true },
  confirmacaoQuitacao: { label: "Confirmação de quitação",   desc: "Enviado quando empréstimo é quitado — imediato", temHorario: false },
};

function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export function CobrancasClient({ 
  pendentes, 
  templates: templatesProp, 
  empresaNome, 
  empresaTelefone, 
  whatsappStatus, 
  regraAtraso, 
  taxaDiaria 
}: Props) {
  const [tab, setTab] = useState<Tab>("disparos");
  const [templates, setTemplates] = useState<TemplateMsg[]>(templatesProp);

  // --- Estados Aba Disparos ---
  const [filtro, setFiltro] = useState<"todos" | "atrasado" | "pendente">("todos");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  
  // Filtramos apenas os templates ativos para os disparos
  const templatesAtivos = useMemo(() => templates.filter((t) => t.ativo), [templates]);
  const [templateId, setTemplateId] = useState(templatesAtivos[0]?.id ?? "");
  
  const [preview, setPreview] = useState<Pendente | null>(null);
  const [disparando, setDisparando] = useState(false);
  const [disparados, setDisparados] = useState<Set<string>>(new Set());

  // --- Estados Aba Notificações ---
  const [notifs, setNotifs] = useState<ConfigNotificacoes>(NOTIF_DEFAULTS);
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifSaved, setNotifSaved] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);

  // --- Estados Aba Templates ---
  const [templateSel, setTemplateSel] = useState(templates[0]?.id ?? "");
  const [templateConteudo, setTemplateConteudo] = useState(templates[0]?.conteudo ?? "");
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);

  // Carrega configurações de notificações
  useEffect(() => {
    if (tab === "notificacoes") {
      setNotifLoading(true);
      fetch("/api/configuracoes/notificacoes")
        .then((r) => r.json())
        .then((d) => {
          setNotifs({ ...NOTIF_DEFAULTS, ...d });
          setNotifLoading(false);
        })
        .catch(() => setNotifLoading(false));
    }
  }, [tab]);

  // Sincroniza o dropdown de disparos quando os templates mudam
  useEffect(() => {
    if (templatesAtivos.length > 0 && !templatesAtivos.find(t => t.id === templateId)) {
      setTemplateId(templatesAtivos[0].id);
    }
  }, [templatesAtivos, templateId]);

  /** Calcula juros de atraso de acordo com a regra configurada */
  function calcJuros(p: Pendente): number {
    if (p.diasAtraso <= 0) return 0;
    const base = regraAtraso === "A"
      ? p.valorDevido
      : Math.max(0, p.valorDevido - (p.valorPago ?? 0));
    return Number((base * p.diasAtraso * taxaDiaria / 100).toFixed(2));
  }

  const lista = useMemo(() =>
    pendentes.filter((p) => filtro === "todos" || p.status === filtro.toUpperCase()),
    [pendentes, filtro]
  );

  const template = templatesAtivos.find((t) => t.id === templateId);

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
    await new Promise((r) => setTimeout(r, 1500));
    setDisparados((prev) => new Set([...prev, ...selecionados]));
    setSelecionados(new Set());
    setDisparando(false);
  }

  // Ações de Gravação de Notificações
  async function salvarNotificacoes() {
    setNotifSaving(true);
    try {
      await fetch("/api/configuracoes/notificacoes", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(notifs),
      });
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 2500);
    } finally {
      setNotifSaving(false);
    }
  }

  function setNotifField<K extends keyof ConfigNotificacoes>(key: K, field: keyof ConfigNotificacao, value: unknown) {
    setNotifs((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  }

  // Ações de Gravação de Templates
  function onTemplateChange(id: string) {
    setTemplateSel(id);
    const t = templates.find((t) => t.id === id);
    if (t) setTemplateConteudo(t.conteudo);
  }

  async function salvarTemplate() {
    if (!templateSel) return;
    setTemplateSaving(true);
    try {
      const res = await fetch("/api/configuracoes/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: templateSel, conteudo: templateConteudo }),
      });
      if (res.ok) {
        setTemplates((prev) =>
          prev.map((t) => (t.id === templateSel ? { ...t, conteudo: templateConteudo } : t))
        );
        setTemplateSaved(true);
        setTimeout(() => setTemplateSaved(false), 2500);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setTemplateSaving(false);
    }
  }

  const atrasados = pendentes.filter((p) => p.status === "ATRASADO").length;
  const pendenteCount = pendentes.filter((p) => p.status === "PENDENTE").length;

  return (
    <div className="space-y-5">
      {/* Menu Superior com Abas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <MessageSquare size={20} className="text-blue-700" />
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Cobranças & Notificações</h1>
            <p className="text-xs text-slate-400 mt-0.5">{atrasados} atrasadas · {pendenteCount} pendentes</p>
          </div>
        </div>

        {/* Abas */}
        <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 gap-1">
          {[
            { id: "disparos", label: "Disparos Manuais" },
            { id: "notificacoes", label: "Notificações Automáticas" },
            { id: "templates", label: "Modelos (Templates)" }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id as Tab)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                tab === item.id 
                  ? "bg-slate-900 text-white" 
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Painel Informativo sobre Cobranças e Templates */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 leading-relaxed space-y-2">
        <p className="font-semibold text-slate-700">Como gerenciar as Cobranças e Mensagens:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li><strong>Disparos Manuais</strong>: Filtre as parcelas por status (atrasadas ou pendentes), selecione os clientes desejados e realize o disparo de mensagens. O valor exibido na lista e na mensagem já inclui os juros diários calculados automaticamente.</li>
          <li><strong>Notificações Automáticas</strong>: Ative notificações recorrentes diárias para eventos como alertas de vencimento antecipado, lembretes de atraso e comprovantes de quitação de contrato.</li>
          <li><strong>Modelos (Templates)</strong>: Edite as mensagens padrão de contato. Insira variáveis de texto como <code className="bg-slate-100 px-1 rounded text-blue-700 font-mono">{"{{nome}}"}</code>, <code className="bg-slate-100 px-1 rounded text-blue-700 font-mono">{"{{valor}}"}</code> ou <code className="bg-slate-100 px-1 rounded text-blue-700 font-mono">{"{{vencimento}}"}</code> que serão substituídas pelos valores reais no momento do disparo.</li>
        </ul>
      </div>

      {/* ─── ABA 1: DISPAROS MANUAIS ─── */}
      {tab === "disparos" && (
        <div className="space-y-4">
          {/* Header de Status WhatsApp (Cinza suave para evitar o tom de rosa de alertas) */}
          <div className="flex items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 flex-wrap">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${whatsappStatus === "CONECTADO" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              <p className="text-xs font-semibold">
                WhatsApp: {whatsappStatus === "CONECTADO" ? "Conectado" : whatsappStatus === "DESCONECTADO" ? "Desconectado" : "Não Configurado"}
              </p>
            </div>
            <Link href="/configuracoes" className="text-xs text-blue-700 hover:underline font-bold">
              Ir para configurações de conexão
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Lista de devedores */}
            <div className="lg:col-span-2 space-y-3">
              {/* Filtros + Seleção de Template */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 gap-0.5">
                  {[["todos","Todos"],["atrasado","Atrasados"],["pendente","Pendentes"]].map(([v,l]) => (
                    <button key={v} onClick={() => setFiltro(v as any)}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${filtro===v ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700"}`}>
                      {l}
                    </button>
                  ))}
                </div>
                
                <div className="flex items-center gap-2">
                  <select
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-slate-400 cursor-pointer"
                  >
                    {templatesAtivos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    {templatesAtivos.length === 0 && <option value="">Sem templates ativos</option>}
                  </select>
                  
                  <button
                    onClick={disparar}
                    disabled={!selecionados.size || disparando || whatsappStatus !== "CONECTADO"}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-700 border border-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <Send size={12}/>
                    {disparando ? "Disparando..." : `Disparar (${selecionados.size})`}
                  </button>
                </div>
              </div>

              {/* Tabela de Inadimplência */}
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200 bg-slate-50/70">
                  <button onClick={toggleTodos} className="text-slate-500 hover:text-slate-700 cursor-pointer">
                    {selecionados.size === lista.length && lista.length > 0
                      ? <CheckSquare size={15} className="text-blue-700" />
                      : <Square size={15}/>}
                  </button>
                  <span className="text-xs text-slate-500 font-semibold">{selecionados.size} selecionados</span>
                </div>

                {lista.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-12">Nenhuma cobrança pendente para exibir</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {lista.map((p) => {
                      const totalComJuros = p.valorDevido + calcJuros(p);
                      return (
                        <div key={p.id}
                          onClick={() => setPreview(p)}
                          className={`flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors ${
                            preview?.id === p.id ? "bg-blue-50/20" :
                            disparados.has(p.id) ? "opacity-45 bg-slate-50/50" :
                            "hover:bg-slate-50/40"
                          }`}
                        >
                          <button onClick={(e) => { e.stopPropagation(); toggleSel(p.id); }} className="text-slate-500 hover:text-slate-700 shrink-0 cursor-pointer">
                            {selecionados.has(p.id) ? <CheckSquare size={15} className="text-blue-700"/> : <Square size={15}/>}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-sm font-semibold text-slate-900 truncate">{p.clienteNome}</p>
                              {disparados.has(p.id) && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md shrink-0">Enviado</span>}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <ScoreBadge score={p.score}/>
                              <span className="text-xs text-slate-400 tabular-nums">{p.clientePhone}</span>
                            </div>
                            
                            {p.diasAtraso > 0 && (() => {
                              const juros = calcJuros(p);
                              return (
                                <div className="mt-1 flex items-center gap-2 flex-wrap text-[10px]">
                                  <span className="text-slate-400">Orig: {formatarMoeda(p.valorDevido)}</span>
                                  <span className="text-red-500 font-bold">Juros (+{p.diasAtraso}d): +{formatarMoeda(juros)}</span>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Valor da cobrança atualizado com juros (sem toggle) */}
                          <div className="text-right shrink-0 space-y-1">
                            <p className="text-sm font-black text-slate-900 tabular-nums">{formatarMoeda(totalComJuros)}</p>
                            <StatusBadge status={p.status as any}/>
                          </div>

                          <div className="text-right shrink-0 hidden sm:block">
                            {p.diasAtraso > 0 ? (
                              <div className="flex items-center justify-end gap-1 text-xs text-red-500 font-semibold">
                                <AlertTriangle size={11}/>
                                {p.diasAtraso}d atraso
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1 text-xs text-slate-500">
                                <Clock size={11}/>
                                {formatarData(p.dataVencimento)}
                              </div>
                            )}
                            <p className="text-[10px] text-slate-400 mt-0.5">Parcela {p.parcelaNum}/{p.totalParcelas}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preview da Mensagem</h2>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5 truncate">
                    {preview ? `Para: ${preview.clienteNome}` : "Selecione um cliente"}
                  </p>
                </div>

                {template && preview ? (
                  <div className="p-4 space-y-3">
                    {/* Bolha do WhatsApp */}
                    <div className="rounded-2xl rounded-tl-none bg-slate-50 border border-slate-200 p-4 max-w-xs shadow-sm">
                      <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                        {renderTemplate(template.conteudo, getVars(preview))}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-2 text-right">
                        {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>

                    <button
                      onClick={() => { setSelecionados(new Set([preview.id])); }}
                      className="w-full rounded-lg bg-blue-700 border border-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-800 transition-colors cursor-pointer"
                    >
                      Selecionar este cliente
                    </button>
                  </div>
                ) : (
                  <div className="p-10 text-center text-slate-400 text-xs">
                    Selecione um cliente na lista para gerar o preview da mensagem com o valor total calculado.
                  </div>
                )}
              </div>

              {/* Variáveis */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Variáveis de Integração</p>
                <div className="space-y-1.5">
                  {[
                    ["{{nome}}",             "Nome do cliente"],
                    ["{{numero}}",           "Número da parcela"],
                    ["{{valor}}",            "Valor devido (inclui juros)"],
                    ["{{vencimento}}",       "Data de vencimento"],
                    ["{{dias_atraso}}",      "Dias em atraso"],
                    ["{{juros_atraso}}",     "Apenas o valor dos juros"],
                  ].map(([v, d]) => (
                    <div key={v} className="flex items-center justify-between text-xs">
                      <code className="text-[10px] text-blue-700 font-mono bg-blue-50 px-1.5 py-0.5 rounded">{v}</code>
                      <span className="text-slate-500 font-medium">{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── ABA 2: NOTIFICAÇÕES AUTOMÁTICAS (MIGRADA) ─── */}
      {tab === "notificacoes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-slate-900">Notificações Automáticas em Segundo Plano</p>
              <p className="text-xs text-slate-400 mt-0.5">Determine gatilhos de horários, regras e templates para notificações sem intervenção</p>
            </div>
            
            <button
              onClick={salvarNotificacoes}
              disabled={notifSaving}
              className="flex items-center gap-1.5 rounded-xl bg-blue-700 border border-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors shrink-0 cursor-pointer"
            >
              {notifSaving ? <Loader2 size={12} className="animate-spin" /> : notifSaved ? <CheckCircle size={12} className="text-emerald-300" /> : <Save size={12} />}
              {notifSaved ? "Salvo!" : "Salvar Configurações"}
            </button>
          </div>

          {notifLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.keys(NOTIF_META) as (keyof ConfigNotificacoes)[]).map((key) => {
                const meta  = NOTIF_META[key];
                const notif = notifs[key];
                return (
                  <div key={key} className={`rounded-2xl border p-5 bg-white transition-all shadow-sm ${notif.ativo ? "border-blue-200" : "border-slate-200"}`}>
                    <div className="flex items-start gap-4">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${notif.ativo ? "bg-blue-50" : "bg-slate-50"}`}>
                        <Bell size={16} className={notif.ativo ? "text-blue-700" : "text-slate-400"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900">{meta.label}</p>
                          {/* Toggle */}
                          <button
                            onClick={() => setNotifField(key, "ativo", !notif.ativo)}
                            className={`relative h-6 w-11 rounded-full transition-colors shrink-0 cursor-pointer ${notif.ativo ? "bg-slate-900" : "bg-slate-200"}`}
                          >
                            <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${notif.ativo ? "left-6" : "left-1"}`} />
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{meta.desc}</p>

                        {notif.ativo && (
                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-50">
                            {/* Horário */}
                            {meta.temHorario ? (
                              <div>
                                <label className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                  <Clock size={10} />
                                  Horário
                                </label>
                                <input
                                  type="time"
                                  value={notif.horario ?? "07:00"}
                                  onChange={(e) => setNotifField(key, "horario", e.target.value)}
                                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-400 cursor-pointer"
                                />
                              </div>
                            ) : (
                              <div className="flex items-center rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                <p className="text-[10px] text-slate-400 leading-tight">Envio em tempo real imediato ao evento cadastrado</p>
                              </div>
                            )}

                            {/* Template */}
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Template</label>
                              <select
                                value={notif.templateId ?? ""}
                                onChange={(e) => setNotifField(key, "templateId", e.target.value || null)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-slate-400 cursor-pointer"
                              >
                                <option value="">Sem template</option>
                                {templates.map((t) => (
                                  <option key={t.id} value={t.id}>{t.nome}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── ABA 3: TEMPLATES / MODELOS DE MENSAGEM (MIGRADA) ─── */}
      {tab === "templates" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-slate-900">Gerenciador de Templates</p>
              <p className="text-xs text-slate-400 mt-0.5">Customize e escreva os modelos de mensagem e cobrança</p>
            </div>
            
            <select
              value={templateSel}
              onChange={(e) => onTemplateChange(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-slate-400 cursor-pointer"
            >
              {templates.map((t) => <option key={t.id} value={t.id}>{t.nome} {t.ativo ? "" : "(Inativo)"}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Editor */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm flex flex-col">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Editor de Mensagem</p>
                <span className="text-[10px] text-slate-500 font-semibold">Placeholders habilitados</span>
              </div>
              <textarea
                value={templateConteudo}
                onChange={(e) => setTemplateConteudo(e.target.value)}
                rows={14}
                className="w-full bg-transparent px-4 py-3 text-xs text-slate-900 font-mono focus:outline-none resize-none leading-relaxed"
                placeholder="Escreva seu template de cobrança..."
              />
            </div>

            {/* Preview WhatsApp (Usa fundo cinza/azul sóbrio, sem rosa) */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm flex flex-col">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Visualização WhatsApp</p>
              </div>
              
              <div className="p-4 bg-slate-100 flex-1 min-h-48 flex items-start justify-center">
                <div className="rounded-2xl rounded-tl-none bg-white border border-slate-200 p-4 max-w-xs shadow-sm w-full">
                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                    {templateConteudo
                      .replace(/\*\*(.*?)\*\*/g, "$1")
                      .replace(/\*(.*?)\*/g, "$1")
                      .replace(/\{\{(\w+)\}\}/g, (_, k) => `[${k}]`)}
                  </p>
                </div>
              </div>

              {/* Botões rápidos de inserção de variável */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] font-bold text-slate-400 uppercase mr-1">Inserir:</span>
                {["{{nome}}", "{{numero}}", "{{valor}}", "{{vencimento}}", "{{dias_atraso}}", "{{telefone_empresa}}"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setTemplateConteudo((c) => c + v)}
                    className="text-[10px] font-mono text-blue-700 hover:text-blue-900 hover:bg-blue-100/60 bg-blue-50 px-2 py-1 rounded transition-colors cursor-pointer"
                  >
                    {v.replace("{{", "").replace("}}", "")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button 
              onClick={salvarTemplate} 
              disabled={templateSaving}
              className="flex items-center gap-1.5 rounded-xl bg-blue-700 border border-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60 transition-colors shrink-0 cursor-pointer"
            >
              {templateSaving ? <Loader2 size={12} className="animate-spin" /> : templateSaved ? <CheckCircle size={12} className="text-emerald-300" /> : <Save size={12} />}
              {templateSaved ? "Modelo Salvo!" : "Salvar Alterações de Modelo"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
