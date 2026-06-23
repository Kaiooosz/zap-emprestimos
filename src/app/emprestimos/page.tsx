import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatarMoeda } from "@/lib/utils";
import { EmprestimosClient } from "@/components/emprestimos/EmprestimosClient";

export const dynamic = "force-dynamic";

const tipoLabel: Record<string, string> = { DIARIO: "Diário", SEMANAL: "Semanal", QUINZENAL: "Quinzenal", MENSAL: "Mensal" };

export default async function EmprestimosPage() {
  const raw = await prisma.emprestimo.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      cliente:  { select: { id: true, nome: true, score: true } },
      parcelas: { select: { status: true, valorDevido: true } },
    },
  });
  const emprestimos = raw.map((e) => ({
    ...e,
    valorPrincipal: Number(e.valorPrincipal),
    valorTotal:     Number(e.valorTotal),
    taxaJuros:      Number(e.taxaJuros),
    parcelasPagas:  e.parcelas.filter((p) => p.status === "PAGO").length,
  }));

  const ativos = emprestimos.filter((e) => e.status === "ATIVO").length;
  const capitalNaRua = emprestimos
    .filter((e) => e.status === "ATIVO")
    .flatMap((e) => e.parcelas.filter((p) => ["PENDENTE","ATRASADO"].includes(p.status)))
    .reduce((s, p) => s + Number(p.valorDevido), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight">Emprestimos</h1>
          <p className="text-xs text-slate-400 mt-0.5">{ativos} ativos · {formatarMoeda(capitalNaRua)} investido</p>
        </div>
        {/* Só aparece no desktop — mobile usa o + da topbar */}
        <Link href="/emprestimos/novo" className="hidden md:flex items-center gap-1.5 rounded-xl bg-blue-700 border border-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition-colors">
          <Plus size={15} strokeWidth={2.5} />
          Novo Emprestimo
        </Link>
      </div>

      {/* Painel Informativo sobre Empréstimos */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 leading-relaxed space-y-2">
        <p className="font-semibold text-slate-700">Gestão e Registro de Contratos:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li><strong>Acompanhamento</strong>: Acesse detalhes individuais clicando em cada contrato na lista para ver o cronograma de parcelas, status de atrasos e acessar o modal de pagamentos parciais, totais ou apenas juros.</li>
          <li><strong>Novo Contrato</strong>: Utilize o botão "Novo Empréstimo" para registrar uma nova operação financeira, escolhendo o devedor, o valor tomado, a taxa de juros do acordo e o número de parcelas.</li>
          <li><strong>Score de Crédito</strong>: O score de crédito do cliente (índice 0-1000 exibido ao lado do nome) é reavaliado e atualizado pelo sistema dinamicamente a cada pagamento realizado ou atraso registrado.</li>
        </ul>
      </div>
      
      <EmprestimosClient emprestimosInicial={emprestimos} />
    </div>
  );
}
