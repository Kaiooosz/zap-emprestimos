import Link from "next/link";
import { Plus, User, MessageCircle, Eye } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { formatarData, formatarMoeda } from "@/lib/utils";
import { decryptCliente } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const hoje = new Date();

  const raw = await prisma.cliente.findMany({
    orderBy: { nome: "asc" },
    include: {
      emprestimos: {
        where: { status: "ATIVO" },
        include: {
          parcelas: {
            where: { status: { in: ["PENDENTE", "ATRASADO", "PARCIAL"] } },
            orderBy: { dataVencimento: "asc" },
          },
        },
      },
      _count: { select: { emprestimos: true } },
    },
  });

  const clientes = raw.map(decryptCliente).map((c) => {
    let temJurosDiario = false;
    let taxaAtrasoDiario = 0;
    let parcelasAtrasadasCount = 0;
    let totalAtrasado = 0;
    let proximaParcela: any = null;

    c.emprestimos.forEach((e: any) => {
      if (Number(e.taxaAtraso) > 0) {
        temJurosDiario = true;
        taxaAtrasoDiario = Number(e.taxaAtraso);
      }
      e.parcelas.forEach((p: any) => {
        const venc = new Date(p.dataVencimento);
        const atrasada = p.status === "ATRASADO" || venc < hoje;
        if (atrasada) {
          parcelasAtrasadasCount++;
          totalAtrasado += Number(p.valorDevido);
        }
        if (!proximaParcela || new Date(p.dataVencimento) < new Date(proximaParcela.dataVencimento)) {
          proximaParcela = p;
        }
      });
    });

    return {
      ...c,
      emprestimosAtivos: c.emprestimos.length,
      totalEmprestimos: c._count.emprestimos,
      temJurosDiario,
      taxaAtrasoDiario,
      parcelasAtrasadasCount,
      totalAtrasado,
      statusFinanceiro: parcelasAtrasadasCount > 0 ? "INADIMPLENTE" : c.emprestimos.length > 0 ? "EM_DIA" : "SEM_CONTRATO",
      proximaParcelaId: proximaParcela?.id,
      proximaParcelaValor: proximaParcela ? Number(proximaParcela.valorDevido) : 0,
      proximaParcelaVenc: proximaParcela ? proximaParcela.dataVencimento : null,
    };
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight">Clientes</h1>
          <p className="text-xs text-slate-400 mt-0.5">{clientes.length} cadastrados</p>
        </div>
        <Link href="/clientes/novo" className="flex items-center gap-1.5 rounded-xl bg-slate-900 border border-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors">
          <Plus size={15} strokeWidth={2.5} />
          Novo Cliente
        </Link>
      </div>

      {/* Painel Informativo sobre Clientes e Score */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 leading-relaxed space-y-2">
        <p className="font-semibold text-slate-700">Gestão de Carteira e Score de Crédito:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li><strong>Perfil e Histórico</strong>: Clique em visualizar para consultar detalhes sobre pagamentos anteriores, contratos ativos, garantias associadas e histórico de score de risco.</li>
          <li><strong>Atraso e Juros Diários</strong>: O indicador de juros diários sinaliza contratos ativos que cobram taxa extra diária sobre parcelas vencidas (Regra A ou Regra B).</li>
          <li><strong>Alertas de Cobrança</strong>: Para clientes inadimplentes, o botão de alerta do WhatsApp envia uma mensagem personalizada formatada contendo o saldo devedor atualizado.</li>
        </ul>
      </div>

      {/* Tabela de Clientes */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["Nome / Contato", "Score", "Juros Diários", "Contratos Ativos", "Status Financeiro", "Ações Rápidas"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clientes.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900">{c.nome}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{c.phone}</p>
                    {c.cpf && <p className="text-[10px] text-slate-400 mt-0.5">{c.cpf}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <ScoreBadge score={c.score} />
                  </td>
                  <td className="px-5 py-4">
                    {c.temJurosDiario ? (
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                        Ativo ({c.taxaAtrasoDiario}%/dia)
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs font-medium text-slate-700">
                      {c.emprestimosAtivos} ativo{c.emprestimosAtivos !== 1 ? "s" : ""} / {c.totalEmprestimos} total
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {c.statusFinanceiro === "INADIMPLENTE" ? (
                      <span className="inline-flex items-center rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 ring-1 ring-inset ring-red-600/10">
                        Inadimplente ({formatarMoeda(c.totalAtrasado)})
                      </span>
                    ) : c.statusFinanceiro === "EM_DIA" ? (
                      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 ring-1 ring-inset ring-emerald-600/10">
                        Em Dia
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500 ring-1 ring-inset ring-slate-600/10">
                        Sem Contrato
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Link href={`/clientes/${c.id}`} title="Visualizar Perfil"
                        className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                        <Eye size={13} />
                        Visualizar
                      </Link>

                      {c.statusFinanceiro === "INADIMPLENTE" && (
                        <a href={`https://api.whatsapp.com/send?phone=${c.phone.replace(/\D/g, "")}&text=${encodeURIComponent(`Ola, ${c.nome}. Identificamos que consta em aberto um valor total de ${c.totalAtrasado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} em atraso. Favor regularizar o pagamento o quanto antes para evitar acrescimos de juros. Obrigado.`)}`}
                          target="_blank" rel="noopener noreferrer" title="Alertar no WhatsApp"
                          className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 hover:text-emerald-600 hover:border-emerald-600 transition-colors">
                          <MessageCircle size={13} />
                          Cobrar
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {clientes.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white py-20 text-center">
          <User size={32} className="text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Nenhum cliente cadastrado</p>
          <Link href="/clientes/novo" className="inline-block mt-3 text-xs text-slate-400 hover:text-blue-700 hover:underline">Cadastrar primeiro cliente</Link>
        </div>
      )}
    </div>
  );
}
