import {
  Activity, CreditCard, HandCoins, CheckCircle, AlertTriangle,
  FileText, TrendingUp, UserPlus, Settings, Shield, ArrowDownCircle, Filter
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatarMoeda } from "@/lib/utils";

export const dynamic = "force-dynamic";

// ── Mapeamento de ações do AuditLog ──────────────────────────────────────────

type TipoEvento =
  | "PAGAMENTO" | "NOVO_EMPRESTIMO" | "QUITACAO" | "ATRASO"
  | "IMPORTACAO" | "CONFIG" | "CLIENTE" | "COBRANCA" | "OUTRO";

function classificarAcao(acao: string): TipoEvento {
  if (acao === "LIQUIDAR_PARCELA") return "PAGAMENTO";
  if (acao === "CRIAR_EMPRESTIMO" || acao === "NOVO_EMPRESTIMO") return "NOVO_EMPRESTIMO";
  if (acao === "QUITAR_CONTRATO") return "QUITACAO";
  if (acao === "INADIMPLENCIA") return "ATRASO";
  if (acao === "IMPORTAR_CSV") return "IMPORTACAO";
  if (acao.startsWith("CONFIG")) return "CONFIG";
  if (acao.startsWith("CLIENTE")) return "CLIENTE";
  if (acao.startsWith("COBRANCA") || acao === "ENFILEIRAR_COBRANCA") return "COBRANCA";
  return "OUTRO";
}

const estiloEvento: Record<TipoEvento, { icon: typeof CreditCard; cor: string; bg: string; label: string }> = {
  PAGAMENTO:       { icon: CreditCard,       cor: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", label: "Pagamento" },
  NOVO_EMPRESTIMO: { icon: HandCoins,        cor: "text-blue-700",   bg: "bg-blue-50 border-blue-200",       label: "Novo Contrato" },
  QUITACAO:        { icon: CheckCircle,      cor: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", label: "Quitação" },
  ATRASO:          { icon: AlertTriangle,    cor: "text-red-600",    bg: "bg-red-50 border-red-200",         label: "Inadimplência" },
  IMPORTACAO:      { icon: ArrowDownCircle,  cor: "text-purple-600", bg: "bg-purple-50 border-purple-200",   label: "Importação" },
  CONFIG:          { icon: Settings,         cor: "text-slate-500",  bg: "bg-slate-50 border-slate-200",     label: "Configuração" },
  CLIENTE:         { icon: UserPlus,         cor: "text-blue-500",   bg: "bg-blue-50 border-blue-200",       label: "Cliente" },
  COBRANCA:        { icon: Shield,           cor: "text-orange-600", bg: "bg-orange-50 border-orange-200",   label: "Cobrança" },
  OUTRO:           { icon: FileText,         cor: "text-slate-500",  bg: "bg-slate-50 border-slate-200",     label: "Operação" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatarDataRelativa(data: Date): string {
  const agora = new Date();
  const diffMs = agora.getTime() - data.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH   = Math.floor(diffMs / 3600000);
  const diffD   = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Agora";
  if (diffMin < 60) return `${diffMin}min atrás`;
  if (diffH < 24) return `${diffH}h atrás`;
  if (diffD === 1) return "Ontem";
  if (diffD < 7) return `${diffD} dias atrás`;
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function extrairValor(detalhes: string): number | null {
  const m = detalhes.match(/R\$\s*([\d.,]+)/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? null : n;
}

function formatarHora(data: Date): string {
  return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ── Agrupar por data ──────────────────────────────────────────────────────────

function agruparPorDia(logs: { id: string; acao: string; detalhes: string; userNome: string | null; createdAt: Date }[]) {
  const grupos: Record<string, typeof logs> = {};
  for (const log of logs) {
    const chave = log.createdAt.toDateString();
    if (!grupos[chave]) grupos[chave] = [];
    grupos[chave].push(log);
  }
  return Object.entries(grupos).map(([chave, itens]) => ({
    data: new Date(chave),
    itens,
  }));
}

function labelDia(data: Date): string {
  const hoje = new Date().toDateString();
  const ontem = new Date(Date.now() - 86400000).toDateString();
  if (data.toDateString() === hoje)  return "Hoje";
  if (data.toDateString() === ontem) return "Ontem";
  return data.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AtividadesPage() {
  const [logs, totais] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.auditLog.groupBy({
      by: ["acao"],
      _count: { id: true },
    }),
  ]);

  const grupos = agruparPorDia(logs);

  const contPorTipo = {
    pagamentos: totais.filter(t => t.acao === "LIQUIDAR_PARCELA").reduce((s, t) => s + t._count.id, 0),
    contratos:  totais.filter(t => t.acao === "CRIAR_EMPRESTIMO" || t.acao === "NOVO_EMPRESTIMO").reduce((s, t) => s + t._count.id, 0),
    clientes:   totais.filter(t => t.acao.startsWith("CLIENTE")).reduce((s, t) => s + t._count.id, 0),
    total:      logs.length,
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Activity size={18} className="text-slate-500 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-slate-900 tracking-tight">Atividades da Equipe</h1>
            <p className="text-xs text-slate-500 mt-0.5">{logs.length} operações registradas</p>
          </div>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Total de Eventos",  value: contPorTipo.total,      cor: "text-slate-700",    bg: "bg-slate-50" },
          { label: "Pagamentos",        value: contPorTipo.pagamentos,  cor: "text-emerald-600",  bg: "bg-emerald-50" },
          { label: "Contratos Criados", value: contPorTipo.contratos,   cor: "text-blue-700",     bg: "bg-blue-50" },
          { label: "Clientes",          value: contPorTipo.clientes,    cor: "text-purple-600",   bg: "bg-purple-50" },
        ].map((k) => (
          <div key={k.label} className={`rounded-xl border border-slate-200 ${k.bg} p-3 shadow-sm`}>
            <p className="text-[10px] font-semibold text-slate-500 truncate">{k.label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${k.cor}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Feed agrupado por dia */}
      <div className="space-y-6">
        {grupos.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <Activity size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-500">Nenhuma atividade registrada ainda</p>
            <p className="text-xs text-slate-400 mt-1">As operações da equipe aparecerão aqui automaticamente</p>
          </div>
        ) : (
          grupos.map(({ data, itens }) => (
            <div key={data.toDateString()} className="space-y-2">

              {/* Label do dia */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-semibold text-slate-500 capitalize whitespace-nowrap">
                  {labelDia(data)} — {data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              {/* Eventos do dia */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {itens.map((log) => {
                    const tipo   = classificarAcao(log.acao);
                    const cfg    = estiloEvento[tipo];
                    const Icon   = cfg.icon;
                    const valor  = extrairValor(log.detalhes);
                    const isPagamento = tipo === "PAGAMENTO";
                    const isNegativo  = tipo === "ATRASO";

                    return (
                      <div key={log.id} className="flex items-start gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors group">

                        {/* Ícone */}
                        <div className={`h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 ${cfg.bg}`}>
                          <Icon size={16} className={cfg.cor} />
                        </div>

                        {/* Conteúdo */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              {/* Badge tipo + ação */}
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.cor} border`}>
                                  {cfg.label}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">{log.acao}</span>
                              </div>
                              {/* Descrição */}
                              <p className="text-xs text-slate-700 leading-relaxed line-clamp-2">
                                {log.detalhes}
                              </p>
                            </div>

                            {/* Valor */}
                            {valor !== null && (
                              <div className="text-right shrink-0">
                                <span className={`text-sm font-bold tabular-nums ${
                                  isNegativo ? "text-red-600" :
                                  isPagamento ? "text-emerald-600" :
                                  "text-slate-800"
                                }`}>
                                  {isNegativo ? "-" : "+"}{formatarMoeda(valor)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Rodapé: operador + hora */}
                          <div className="flex items-center gap-2 mt-2">
                            <div className="h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                              <span className="text-[9px] font-bold text-slate-600">
                                {(log.userNome ?? "S")[0].toUpperCase()}
                              </span>
                            </div>
                            <span className="text-[11px] font-semibold text-slate-700">
                              {log.userNome ?? "Sistema"}
                            </span>
                            <span className="text-[11px] text-slate-400">·</span>
                            <span className="text-[11px] text-slate-400">
                              {formatarDataRelativa(log.createdAt)} às {formatarHora(log.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
