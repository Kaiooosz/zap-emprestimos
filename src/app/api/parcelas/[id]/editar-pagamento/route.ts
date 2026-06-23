import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarLog } from "@/lib/audit";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const parcela = await prisma.parcela.findUnique({
      where: { id },
      include: { emprestimo: { include: { cliente: true } } },
    });

    if (!parcela) {
      return NextResponse.json({ error: "Parcela não encontrada" }, { status: 404 });
    }

    if (parcela.status === "PENDENTE" || parcela.status === "ATRASADO") {
      return NextResponse.json({ error: "Apenas parcelas pagas podem ser editadas." }, { status: 400 });
    }

    const session = await getSession();
    const operadorNome = session?.nome ?? "Sistema";

    // Atualiza apenas os metadados: data e formas de pagamento
    const { dataPagamento, formasPagamento } = body;

    const dataPagamentoAtualizada = dataPagamento ? new Date(dataPagamento) : parcela.dataPagamento;

    await prisma.parcela.update({
      where: { id },
      data: {
        dataPagamento: dataPagamentoAtualizada,
        formasPagamento: JSON.stringify(formasPagamento),
      },
    });

    // Registra auditoria
    const msgLog = `O operador ${operadorNome} editou os metadados do pagamento da parcela ${parcela.numero} (Contrato ID: ${parcela.emprestimoId}) do cliente ${parcela.emprestimo.cliente.nome}. Nova Data: ${dataPagamentoAtualizada?.toLocaleString("pt-BR")}.`;
    await registrarLog("EDITAR_PAGAMENTO", msgLog);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao editar pagamento" }, { status: 500 });
  }
}
