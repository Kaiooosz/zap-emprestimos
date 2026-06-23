import { Suspense } from "react";
import Link from "next/link";
import { Plus, User, MessageCircle, Eye, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { formatarData, formatarMoeda, obterMeiaNoiteBR } from "@/lib/utils";
import { decryptCliente } from "@/lib/crypto";
import { ClientesClient } from "@/components/clientes/ClientesClient";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const inicioHoje = obterMeiaNoiteBR();

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
        const venc = obterMeiaNoiteBR(p.dataVencimento);
        const atrasada = p.status === "ATRASADO" || venc < inicioHoje;
        if (atrasada) {
          parcelasAtrasadasCount++;
          totalAtrasado += Number(p.valorDevido);
        }
        if (!proximaParcela || obterMeiaNoiteBR(p.dataVencimento) < obterMeiaNoiteBR(proximaParcela.dataVencimento)) {
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
      statusFinanceiro: (parcelasAtrasadasCount > 0 ? "INADIMPLENTE" : c.emprestimos.length > 0 ? "EM_DIA" : "SEM_CONTRATO") as "INADIMPLENTE" | "EM_DIA" | "SEM_CONTRATO",
      proximaParcelaId: proximaParcela?.id,
      proximaParcelaValor: proximaParcela ? Number(proximaParcela.valorDevido) : 0,
      proximaParcelaVenc: proximaParcela ? proximaParcela.dataVencimento : null,
    };
  });

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight">Clientes</h1>
          <p className="text-xs text-slate-400 mt-0.5">{clientes.length} cadastrados</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/clientes/importar"
            className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
            Importar
          </Link>
          <Link href="/clientes/novo"
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors">
            <Plus size={13} strokeWidth={2.5} />
            Novo Cliente
          </Link>
        </div>
      </div>
      <Suspense fallback={<div className="py-10 text-center text-sm text-slate-400">Carregando lista de clientes...</div>}>
        <ClientesClient clientesInicial={clientes} />
      </Suspense>
    </div>
  );
}
