import { Activity, CreditCard, MessageSquare, User, HandCoins, CheckCircle, AlertTriangle, FileText, TrendingUp } from "lucide-react";
import { store } from "@/lib/store";
import { formatarMoeda, formatarData } from "@/lib/utils";
import { NovaAtividadeForm } from "@/components/atividades/NovaAtividadeForm";

export const dynamic = "force-dynamic";

type TipoAtividade =
  | "PAGAMENTO"
  | "ACORDO"
  | "CONTATO"
  | "NOVO_EMPRESTIMO"
  | "QUITACAO"
  | "ATRASO"
  | "OBSERVACAO"
  | "RENOVACAO";

interface Atividade {
  id: string;
  tipo: TipoAtividade;
  descricao: string;
  valor?: number;
  clienteNome: string;
  clienteId: string;
  data: string;
  operador: string;
  tag?: string;
}

const iconPorTipo: Record<TipoAtividade, { icon: typeof CreditCard; cor: string; bg: string }> = {
  PAGAMENTO:      { icon: CreditCard,    cor: "text-emerald-600", bg: "bg-emerald-50" },
  ACORDO:         { icon: FileText,      cor: "text-blue-600",    bg: "bg-blue-50" },
  CONTATO:        { icon: MessageSquare, cor: "text-slate-600",   bg: "bg-slate-50" },
  NOVO_EMPRESTIMO:{ icon: HandCoins,     cor: "text-blue-700",   bg: "bg-blue-50" },
  QUITACAO:       { icon: CheckCircle,   cor: "text-emerald-700", bg: "bg-emerald-50" },
  ATRASO:         { icon: AlertTriangle, cor: "text-red-600",     bg: "bg-red-50" },
  OBSERVACAO:     { icon: FileText,      cor: "text-slate-500",   bg: "bg-slate-50" },
  RENOVACAO:      { icon: TrendingUp,    cor: "text-blue-600",    bg: "bg-blue-50" },
};

function gerarAtividadesDoStore(): Atividade[] {
  const atividades: Atividade[] = [];
  const emprestimos = store.emprestimos.list();

  for (const e of emprestimos) {
    const cliente = store.clientes.get(e.clienteId);
    const nomeCliente = cliente?.nome ?? "—";
    const parcelas = store.parcelas.list(e.id);

    // Criacao do emprestimo
    atividades.push({
      id: `${e.id}-criado`,
      tipo: "NOVO_EMPRESTIMO",
      descricao: `Novo contrato criado — ${e.tipoProduto} de ${formatarMoeda(e.valorPrincipal)} em ${e.numParcelas}x`,
      valor: e.valorPrincipal,
      clienteNome: nomeCliente,
      clienteId: e.clienteId,
      data: e.createdAt,
      operador: "Admin",
      tag: e.tipoProduto,
    });

    // Quitacao
    if (e.status === "QUITADO") {
      atividades.push({
        id: `${e.id}-quitado`,
        tipo: "QUITACAO",
        descricao: `Contrato quitado — Total pago: ${formatarMoeda(e.valorTotal)}`,
        valor: e.valorTotal,
        clienteNome: nomeCliente,
        clienteId: e.clienteId,
        data: parcelas[parcelas.length - 1]?.dataPagamento ?? e.dataVencimento,
        operador: "Sistema",
      });
    }

    // Inadimplencia
    if (e.status === "INADIMPLENTE") {
      atividades.push({
        id: `${e.id}-inadimplente`,
        tipo: "ATRASO",
        descricao: `Contrato marcado como inadimplente`,
        valor: store.parcelas.getSaldoDevedor(e.id),
        clienteNome: nomeCliente,
        clienteId: e.clienteId,
        data: e.dataVencimento,
        operador: "Sistema",
      });
    }

    // Pagamentos
    for (const p of parcelas.filter((pp) => pp.status === "PAGO" && pp.dataPagamento)) {
      atividades.push({
        id: `${p.id}-pago`,
        tipo: "PAGAMENTO",
        descricao: `Parcela ${p.numero}/${e.numParcelas} recebida${p.modoPagamento === "SOMENTE_JUROS" ? " (somente juros)" : p.modoPagamento === "QUITACAO_TOTAL" ? " (quitacao total)" : ""}`,
        valor: p.valorPago,
        clienteNome: nomeCliente,
        clienteId: e.clienteId,
        data: p.dataPagamento!,
        operador: "Operador",
        tag: p.modoPagamento,
      });
    }
  }

  return atividades.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
}

export default function AtividadesPage() {
  const atividades = gerarAtividadesDoStore();
  const hoje = new Date().toDateString();

  const por_tipo = {
    pagamentos: atividades.filter((a) => a.tipo === "PAGAMENTO").length,
    novos:      atividades.filter((a) => a.tipo === "NOVO_EMPRESTIMO").length,
    quitacoes:  atividades.filter((a) => a.tipo === "QUITACAO").length,
    atrasos:    atividades.filter((a) => a.tipo === "ATRASO").length,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Activity size={18} className="text-slate-500 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-slate-900 tracking-tight truncate">Atividades</h1>
            <p className="text-xs text-slate-500 mt-0.5">{atividades.length} eventos</p>
          </div>
        </div>
        <NovaAtividadeForm clientes={store.clientes.list()} />
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Pagamentos", value: por_tipo.pagamentos, cor: "text-emerald-600" },
          { label: "Contratos",  value: por_tipo.novos,      cor: "text-blue-700" },
          { label: "Quitacoes",  value: por_tipo.quitacoes,  cor: "text-emerald-700" },
          { label: "Atrasos",    value: por_tipo.atrasos,    cor: "text-red-600" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-[10px] font-medium text-slate-500 truncate">{k.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${k.cor}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Feed */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Feed de Atividades</h2>
        </div>

        {atividades.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-12">Nenhuma atividade registrada</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {atividades.map((a) => {
              const cfg = iconPorTipo[a.tipo];
              const Icon = cfg.icon;
              const isHoje = new Date(a.data).toDateString() === hoje;
              return (
                <div key={a.id} className="flex items-start gap-3 px-3 py-3 hover:bg-slate-50 transition-colors">
                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <Icon size={16} className={cfg.cor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-semibold text-slate-800">{a.clienteNome}</span>
                      {a.tag && (
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full capitalize">
                          {a.tag.toLowerCase().replace("_", " ")}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">{a.descricao}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-400">
                        {isHoje ? "Hoje" : formatarData(a.data)} — {a.operador}
                      </span>
                      {a.valor !== undefined && (
                        <span className={`text-xs font-semibold ${a.tipo === "ATRASO" ? "text-red-600" : "text-emerald-600"}`}>
                          {a.tipo === "ATRASO" ? "-" : "+"}{formatarMoeda(a.valor)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-400 shrink-0 hidden sm:block">
                    {new Date(a.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
