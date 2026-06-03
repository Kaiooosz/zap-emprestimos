"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { User, Building2, MessageSquare, Smartphone, FileText, Save, RefreshCw, CheckCircle, QrCode } from "lucide-react";
import { ConfigEmpresa, ConfigWhatsApp, TemplateMsg } from "@/lib/store";

type Tab = "perfil" | "empresa" | "whatsapp" | "templates" | "agente";

interface Props {
  empresa: ConfigEmpresa;
  whatsapp: ConfigWhatsApp;
  templates: TemplateMsg[];
}

const tabs: { id: Tab; label: string; icon: typeof User }[] = [
  { id: "perfil",    label: "Perfil",        icon: User },
  { id: "empresa",   label: "Empresa",       icon: Building2 },
  { id: "whatsapp",  label: "WhatsApp",      icon: Smartphone },
  { id: "templates", label: "Templates",     icon: MessageSquare },
  { id: "agente",    label: "Agente IA",     icon: FileText },
];

const AGENTE_MD_INICIAL = `# Agente de Cobranças — Zap Empréstimos

## Identidade
Você é o assistente de cobranças da **Zap Empréstimos**.
Seu nome é **Zap** e você representa a empresa de forma profissional e empática.

## Objetivo
Recuperar parcelas em atraso e lembrar clientes de vencimentos futuros via WhatsApp.

## Tom de Comunicação
- **Cordial e profissional** — nunca agressivo
- **Objetivo e claro** — mensagens curtas e diretas
- **Empático** — reconhece dificuldades financeiras
- **Orientado a solução** — sempre ofereça uma saída

## Fluxo de Cobrança

### 1. Lembrete (3 dias antes do vencimento)
Use o template **Lembrete de Vencimento**.
- Tom: amigável e informativo
- Não mencionar atraso

### 2. Cobrança no vencimento
Use o template **Cobrança Padrão**.
- Tom: neutro e direto
- Oferecer link de pagamento (PIX/boleto)

### 3. Atraso 1-7 dias
Use o template **Cobrança Padrão** com urgência leve.
- Mencionar que o score pode ser afetado

### 4. Atraso 8-30 dias
Use o template **Cobrança — Atraso Grave**.
- Tom: sério mas ainda negociável
- Oferecer parcelamento se necessário

### 5. Atraso 31+ dias
Escalação para atendimento humano.
- Agente não deve continuar sem supervisão
- Transferir para cobrador responsável

## Regras Absolutas
- Nunca revelar dados de outros clientes
- Nunca fazer ameaças legais sem autorização
- Nunca negociar descontos acima de 10% sem aprovação
- Sempre registrar o contato no sistema

## Horários de Disparo
- Lembretes: 09h00
- Cobranças: 10h00
- Atrasos graves: 14h00
- Nunca disparar entre 20h00–08h00

## Personalização de Variáveis
As mensagens usam as seguintes variáveis dinâmicas:
- \`{{nome}}\` — Nome completo do cliente
- \`{{valor}}\` — Valor da parcela
- \`{{vencimento}}\` — Data de vencimento
- \`{{dias_atraso}}\` — Dias em atraso
- \`{{numero}}\` — Número da parcela
- \`{{telefone_empresa}}\` — Contato da empresa
`;

export function ConfiguracoesClient({ empresa, whatsapp, templates }: Props) {
  const searchParams = useSearchParams();
  const tabInicial   = (searchParams.get("tab") as Tab) ?? "perfil";

  const [tab, setTab]             = useState<Tab>(tabInicial);
  const [saved, setSaved]         = useState(false);
  const [agentemd, setAgenteMd]   = useState(AGENTE_MD_INICIAL);
  const [templateSel, setTemplateSel] = useState(templates[0]?.id ?? "");
  const [templateConteudo, setTemplateConteudo] = useState(templates[0]?.conteudo ?? "");
  const [qrVisible, setQrVisible] = useState(false);

  // Formulário empresa
  const [emp, setEmp] = useState({ ...empresa });
  // Formulário WhatsApp
  const [zap, setZap] = useState({ ...whatsapp });

  function setEmpField(k: keyof ConfigEmpresa, v: string | number) {
    setEmp((prev) => ({ ...prev, [k]: v }));
  }
  function setZapField(k: keyof ConfigWhatsApp, v: any) {
    setZap((prev) => ({ ...prev, [k]: v }));
  }

  function onSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function onTemplateChange(id: string) {
    setTemplateSel(id);
    const t = templates.find((t) => t.id === id);
    if (t) setTemplateConteudo(t.conteudo);
  }

  return (
    <div className="space-y-5">
      <h1 className="text-base font-semibold text-slate-900 tracking-tight">Configurações</h1>

      <div className="flex gap-5 flex-col lg:flex-row">
        {/* Sidebar de abas */}
        <nav className="flex lg:flex-col gap-1 lg:w-44 shrink-0">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-left transition-all ${
                tab === id
                  ? "bg-slate-50 text-slate-100"
                  : "text-slate-500 hover:bg-white hover:text-slate-300"
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          {/* ── Perfil ── */}
          {tab === "perfil" && (
            <Section title="Perfil do Usuário" onSave={onSave} saved={saved}>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl font-bold text-white">A</div>
                <div>
                  <p className="font-semibold text-white">Admin Zap</p>
                  <p className="text-xs text-slate-400">admin@zap.com</p>
                  <button className="text-xs text-slate-500 hover:text-slate-300 mt-1 underline">Trocar foto</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nome" defaultValue="Admin Zap" />
                <Field label="E-mail" defaultValue="admin@zap.com" type="email" />
                <Field label="Telefone" defaultValue="(11) 99000-0001" />
                <Field label="Cargo" defaultValue="Administrador" />
                <Field label="Nova Senha" placeholder="••••••••" type="password" />
                <Field label="Confirmar Senha" placeholder="••••••••" type="password" />
              </div>
            </Section>
          )}

          {/* ── Empresa ── */}
          {tab === "empresa" && (
            <Section title="Dados da Empresa" onSave={onSave} saved={saved}>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Razão Social" value={emp.razaoSocial} onChange={(v) => setEmpField("razaoSocial", v)} />
                <Field label="Nome Fantasia" value={emp.nomeFantasia} onChange={(v) => setEmpField("nomeFantasia", v)} />
                <Field label="CNPJ" value={emp.cnpj} onChange={(v) => setEmpField("cnpj", v)} />
                <Field label="Telefone" value={emp.telefone} onChange={(v) => setEmpField("telefone", v)} />
                <Field label="E-mail" value={emp.email} onChange={(v) => setEmpField("email", v)} />
                <div className="col-span-2">
                  <Field label="Endereço" value={emp.endereco} onChange={(v) => setEmpField("endereco", v)} />
                </div>
              </div>
              <div className="border-t border-slate-200 pt-4 mt-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Padrões Operacionais</p>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Taxa Padrão (%)" type="number" value={String(emp.taxaJurosPadrao)} onChange={(v) => setEmpField("taxaJurosPadrao", Number(v))} />
                  <Field label="Limite Mín (R$)" type="number" value={String(emp.limiteEmprestimoMin)} onChange={(v) => setEmpField("limiteEmprestimoMin", Number(v))} />
                  <Field label="Limite Máx (R$)" type="number" value={String(emp.limiteEmprestimoMax)} onChange={(v) => setEmpField("limiteEmprestimoMax", Number(v))} />
                </div>
              </div>
            </Section>
          )}

          {/* ── WhatsApp ── */}
          {tab === "whatsapp" && (
            <Section title="Conexão WhatsApp" onSave={onSave} saved={saved}>
              {/* Status */}
              <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 mb-5 ${
                zap.status === "CONECTADO"
                  ? "border-emerald-800 bg-emerald-900/20"
                  : "border-red-800 bg-red-900/20"
              }`}>
                <div className={`h-2.5 w-2.5 rounded-full ${zap.status === "CONECTADO" ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                <p className="text-sm font-medium text-slate-200">
                  {zap.status === "CONECTADO" ? "Conectado" : zap.status === "DESCONECTADO" ? "Desconectado" : "Não configurado"}
                </p>
                {zap.status !== "CONECTADO" && (
                  <button onClick={() => setQrVisible(!qrVisible)} className="ml-auto flex items-center gap-1.5 text-xs text-slate-300 hover:text-white">
                    <QrCode size={13}/>
                    {qrVisible ? "Fechar QR" : "Conectar via QR"}
                  </button>
                )}
              </div>

              {/* QR Code simulado */}
              {qrVisible && (
                <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 text-center">
                  <p className="text-xs text-slate-400 mb-3">Escaneie o QR Code com o WhatsApp Business</p>
                  <div className="inline-block border-8 border-white rounded-lg p-2">
                    <div className="h-40 w-40 bg-white flex items-center justify-center">
                      <QrCode size={100} className="text-black" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">O código expira em 60 segundos</p>
                  <button onClick={() => setZapField("status", "CONECTADO")}
                    className="mt-3 text-xs text-emerald-400 underline hover:text-emerald-300">
                    Simular conexão bem-sucedida
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Field label="URL da API (Evolution API)" value={zap.apiUrl} onChange={(v) => setZapField("apiUrl", v)} placeholder="http://localhost:8080" />
                <Field label="API Key" value={zap.apiKey} onChange={(v) => setZapField("apiKey", v)} placeholder="sua-chave-aqui" type="password" />
                <Field label="Instância" value={zap.instance} onChange={(v) => setZapField("instance", v)} placeholder="zap-emprestimos" />
                <Field label="Número Business" value={zap.numeroBusiness} onChange={(v) => setZapField("numeroBusiness", v)} placeholder="+5511999990000" />
              </div>

              <div className="border-t border-slate-200 pt-4 mt-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Notificações Automáticas</p>
                <div className="space-y-3">
                  {[
                    { key: "notificacoes7h",    label: "Resumo diário 07h00",          desc: "Visão geral de vencimentos do dia" },
                    { key: "notificacoes8h",    label: "Relatório de cobranças 08h00", desc: "Lista de parcelas atrasadas" },
                    { key: "notificacoes12h",   label: "Lembrete 12h00",               desc: "Parcelas não cobradas pela manhã" },
                    { key: "enviarBemVindas",   label: "Boas-vindas ao novo contrato", desc: "Enviado ao criar empréstimo" },
                    { key: "enviarLembrete3dias",label: "Lembrete 3 dias antes",       desc: "Alerta antecipado de vencimento" },
                    { key: "enviarQuitacao",    label: "Confirmação de quitação",      desc: "Enviado quando empréstimo é quitado" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-300">{label}</p>
                        <p className="text-xs text-slate-500">{desc}</p>
                      </div>
                      <button
                        onClick={() => setZapField(key as any, !(zap as any)[key])}
                        className={`relative h-5 w-9 rounded-full transition-colors ${(zap as any)[key] ? "bg-slate-400" : "bg-slate-700"}`}
                      >
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${(zap as any)[key] ? "left-4" : "left-0.5"}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {/* ── Templates ── */}
          {tab === "templates" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Templates de Mensagem</p>
                <select
                  value={templateSel}
                  onChange={(e) => onTemplateChange(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
                >
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Editor */}
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Editor</p>
                    <span className="text-xs text-slate-600">Markdown + Variáveis</span>
                  </div>
                  <textarea
                    value={templateConteudo}
                    onChange={(e) => setTemplateConteudo(e.target.value)}
                    rows={16}
                    className="w-full bg-transparent px-4 py-3 text-sm text-slate-300 font-mono focus:outline-none resize-none"
                    placeholder="Escreva sua mensagem aqui..."
                  />
                </div>

                {/* Preview WhatsApp */}
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Preview WhatsApp</p>
                  </div>
                  <div className="p-4 bg-[#0a1018] min-h-48">
                    <div className="rounded-2xl rounded-tl-none bg-slate-50 border border-slate-200 p-3 max-w-xs">
                      <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {templateConteudo
                          .replace(/\*\*(.*?)\*\*/g, "$1")
                          .replace(/\*(.*?)\*/g, "$1")
                          .replace(/\{\{(\w+)\}\}/g, (_, k) => `[${k}]`)}
                      </p>
                    </div>
                  </div>
                  <div className="px-4 pb-4">
                    <div className="rounded-xl border border-slate-200 p-3 space-y-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Variáveis</p>
                      {["{{nome}}", "{{numero}}", "{{valor}}", "{{vencimento}}", "{{dias_atraso}}", "{{telefone_empresa}}"].map((v) => (
                        <div key={v} className="flex items-center gap-2">
                          <button
                            onClick={() => setTemplateConteudo((c) => c + v)}
                            className="text-xs font-mono text-slate-400 hover:text-slate-200 bg-slate-100 px-2 py-0.5 rounded"
                          >{v}</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={onSave} className="flex items-center gap-2 rounded-xl border border-blue-700 bg-blue-700 px-5 py-2 text-sm font-semibold text-slate-900 hover:bg-blue-800 transition-colors">
                  <Save size={14}/>
                  Salvar Template
                </button>
              </div>
            </div>
          )}

          {/* ── Agente IA ── */}
          {tab === "agente" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Este arquivo Markdown define o comportamento do agente de IA que fará os disparos automáticos de cobrança.
                  Cole o conteúdo abaixo no seu sistema de agentes (Claude, GPT, etc.) como <strong className="text-slate-200">System Prompt</strong>.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">agente-cobrancas.md</p>
                  <button
                    onClick={() => { navigator.clipboard.writeText(agentemd); }}
                    className="text-xs text-slate-500 hover:text-slate-300"
                  >
                    Copiar
                  </button>
                </div>
                <textarea
                  value={agentemd}
                  onChange={(e) => setAgenteMd(e.target.value)}
                  rows={28}
                  className="w-full bg-transparent px-4 py-3 text-sm text-slate-300 font-mono focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => setAgenteMd(AGENTE_MD_INICIAL)} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors">
                  <RefreshCw size={12}/>
                  Restaurar padrão
                </button>
                <button onClick={onSave} className="flex items-center gap-2 rounded-xl border border-blue-700 bg-blue-700 px-5 py-2 text-sm font-semibold text-slate-900 hover:bg-blue-800 transition-colors">
                  <Save size={14}/>
                  Salvar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children, onSave, saved }: { title: string; children: React.ReactNode; onSave: () => void; saved: boolean }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <button
          onClick={onSave}
          className="flex items-center gap-2 rounded-xl border border-blue-700 bg-blue-700 px-5 py-2 text-sm font-semibold text-slate-900 hover:bg-blue-800 transition-colors"
        >
          {saved ? <CheckCircle size={14} className="text-emerald-400"/> : <Save size={14}/>}
          {saved ? "Salvo!" : "Salvar"}
        </button>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, defaultValue, onChange, type = "text", placeholder }: {
  label: string; value?: string; defaultValue?: string;
  onChange?: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      <input
        type={type}
        defaultValue={defaultValue}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-slate-500 transition-colors"
      />
    </div>
  );
}

