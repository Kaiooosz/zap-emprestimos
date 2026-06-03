import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { store } from "@/lib/store";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { formatarMoeda, formatarData } from "@/lib/utils";
import { DetalheEmprestimoClient } from "@/components/emprestimos/DetalheEmprestimoClient";

export const dynamic = "force-dynamic";

const tipoProdutoLabel: Record<string, string> = {
  EMPRESTIMO: "Empréstimo", DESCONTO_CHEQUE: "Desconto de Cheque",
  RENOVACAO: "Renovação", VENDA: "Venda Parcelada",
  ALUGUEL: "Aluguel/Contrato", ASSINATURA: "Assinatura",
};

const modalidadeLabel: Record<string, string> = {
  SIMPLES: "Juros Simples", POR_PARCELA: "Juros por Parcela",
};

export default async function EmprestimoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = store.emprestimos.get(id);
  if (!e) notFound();
  const cliente = store.clientes.get(e.clienteId);
  const parcelas = store.parcelas.list(id);
  const pagas    = parcelas.filter((p) => p.status === "PAGO").length;
  const saldoDevedor = store.parcelas.getSaldoDevedor(id);

  const infoCards = [
    { label: "Tipo de Operação",  value: tipoProdutoLabel[e.tipoProduto] ?? e.tipoProduto },
    { label: "Modalidade de Juros", value: modalidadeLabel[e.modalidadeJuros] ?? e.modalidadeJuros },
    { label: "Valor Principal",   value: formatarMoeda(e.valorPrincipal) },
    { label: "Total com Juros",   value: formatarMoeda(e.valorTotal),    accent: true },
    { label: "Total de Juros",    value: formatarMoeda(e.totalJuros) },
    { label: "Taxa de Juros",     value: `${e.taxaJuros}% / parcela` },
    { label: "Saldo Devedor",     value: formatarMoeda(saldoDevedor),    red: saldoDevedor > 0 },
    { label: "Início",            value: formatarData(e.dataInicio) },
    ...(e.temGarantia ? [{ label: "Garantia", value: `${e.tipoGarantia ?? "—"} — ${e.valorGarantia ? formatarMoeda(e.valorGarantia) : "—"}` }] : []),
    ...(e.temContrato  ? [{ label: "Contrato", value: "Contrato formal assinado" }] : []),
    ...(e.tipoProduto === "DESCONTO_CHEQUE" ? [{ label: "Cheque", value: `Nominal: ${formatarMoeda(e.valorNominalCheque ?? 0)} — Data: ${e.dataCheque ? formatarData(e.dataCheque) : "—"}` }] : []),
    ...(e.tipoProduto === "VENDA" && e.custo ? [{ label: "Custo / Lucro", value: `${formatarMoeda(e.custo)} → ${formatarMoeda(e.valorPrincipal - e.custo)}` }] : []),
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/emprestimos" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-slate-500 hover:text-white transition-colors">
          <ArrowLeft size={15} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-base font-semibold text-slate-900 tracking-tight">
              {tipoProdutoLabel[e.tipoProduto] ?? e.tipoProduto} #{id.slice(0, 8)}
            </h1>
            <StatusBadge status={e.status} />
            {e.temGarantia && (
              <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full">Com Garantia</span>
            )}
            {e.temContrato && (
              <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full">Contrato Formal</span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Cliente: {cliente?.nome ?? "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Info cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {infoCards.map((c) => (
              <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium text-slate-500">{c.label}</p>
                <p className={`text-sm font-bold mt-0.5 break-words text-slate-900"}`}>{c.value}</p>
              </div>
            ))}
          </div>

          {/* Progresso */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-900">Progresso das Parcelas</p>
              <p className="text-xs text-slate-400">{pagas} de {e.numParcelas} pagas</p>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-700 overflow-hidden">
              <div className="h-full rounded-full bg-slate-400 transition-all" style={{ width: `${(pagas / e.numParcelas) * 100}%` }} />
            </div>
          </div>

          {/* Parcelas — client component para o modal */}
          <DetalheEmprestimoClient
            parcelas={parcelas}
            saldoDevedor={saldoDevedor}
            clientePhone={cliente?.phone ?? ""}
            clienteNome={cliente?.nome ?? ""}
          />
        </div>

        {/* Perfil cliente */}
        {cliente && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-700 shrink-0">
                  {cliente.nome[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{cliente.nome}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{cliente.phone}</p>
                </div>
              </div>
              <ScoreBadge score={cliente.score} />
              {cliente.profissao && <p className="text-xs text-slate-500">{cliente.profissao}{cliente.rendaMensal ? ` — ${formatarMoeda(cliente.rendaMensal)}/mês` : ""}</p>}
              {cliente.cpf && <p className="text-xs text-slate-500">{cliente.cpf}</p>}
              {cliente.garantia && (
                <div className="rounded-lg bg-white border border-slate-200 p-3">
                  <p className="text-xs font-semibold text-slate-400 mb-1">Garantia do Cliente</p>
                  <p className="text-xs text-slate-600">{cliente.tipoGarantia} — {cliente.descricaoGarantia ?? "—"}</p>
                  {cliente.valorGarantia && <p className="text-xs text-slate-500 mt-0.5">{formatarMoeda(cliente.valorGarantia)}</p>}
                </div>
              )}
              <div className="flex gap-2">
                <Link href={`/clientes/${cliente.id}`} className="flex-1 text-center text-xs text-slate-400 hover:text-blue-700 hover:underline">
                  Ver perfil completo
                </Link>
                <a
                  href={`https://wa.me/${cliente.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá *${cliente.nome}*! Aqui é da Zap Empréstimos. Passando para falar sobre seu contrato.`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-400"
                >
                  <MessageCircle size={12} /> WhatsApp
                </a>
              </div>
            </div>

            {e.observacoes && (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold text-slate-500 mb-1">Observações</p>
                <p className="text-xs text-slate-400">{e.observacoes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
