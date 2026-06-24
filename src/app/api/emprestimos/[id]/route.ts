import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const emprestimo = await prisma.emprestimo.findUnique({
      where:   { id },
      include: { parcelas: { orderBy: { numero: "asc" } }, cliente: true },
    });
    if (!emprestimo) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(emprestimo);
  } catch (e) { console.error(e); return NextResponse.json({ error: "Erro interno." }, { status: 500 }); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body   = await req.json();
    const { status, dataInicio, dataVencimento, observacoes, taxaAtraso, taxaJuros, valorPrincipal, parcelas, deletedParcelaIds } = body;

    // Remove parcelas que foram deletadas no frontend
    if (deletedParcelaIds && Array.isArray(deletedParcelaIds)) {
      await prisma.parcela.deleteMany({
        where: { id: { in: deletedParcelaIds } }
      });
    }

    // Cria ou atualiza as parcelas
    if (parcelas && Array.isArray(parcelas)) {
      for (const p of parcelas) {
        if (p.id) {
          await prisma.parcela.update({
            where: { id: p.id },
            data: {
              numero: p.numero !== undefined ? Number(p.numero) : undefined,
              valorDevido: p.valorDevido !== undefined ? Number(p.valorDevido) : undefined,
              valorPrincipal: p.valorPrincipal !== undefined ? Number(p.valorPrincipal) : undefined,
              valorJuros: p.valorJuros !== undefined ? Number(p.valorJuros) : undefined,
              valorPago: p.valorPago !== undefined ? (p.valorPago ? Number(p.valorPago) : null) : undefined,
              dataVencimento: p.dataVencimento ? new Date(p.dataVencimento + "T12:00:00") : undefined,
              dataPagamento: p.dataPagamento ? new Date(p.dataPagamento + "T12:00:00") : null,
              status: p.status ?? undefined,
              modoPagamento: p.status === "PAGO" ? "COMPLETO" : undefined,
            }
          });
        } else {
          await prisma.parcela.create({
            data: {
              emprestimoId: id,
              numero: Number(p.numero),
              valorDevido: Number(p.valorDevido),
              valorPrincipal: Number(p.valorPrincipal),
              valorJuros: Number(p.valorJuros),
              valorPago: p.valorPago ? Number(p.valorPago) : null,
              dataVencimento: new Date(p.dataVencimento + "T12:00:00"),
              dataPagamento: p.dataPagamento ? new Date(p.dataPagamento + "T12:00:00") : null,
              status: p.status || "PENDENTE",
              modoPagamento: p.status === "PAGO" ? "COMPLETO" : undefined,
            }
          });
        }
      }
    }

    // Recalcula totais do contrato
    const todasParcelas = await prisma.parcela.findMany({
      where: { emprestimoId: id }
    });

    const numParcelas = todasParcelas.length;
    const valorTotal = todasParcelas.reduce((s, p) => s + Number(p.valorDevido), 0);
    const totalJuros = todasParcelas.reduce((s, p) => s + Number(p.valorJuros), 0);

    // Ajusta o status do empréstimo de acordo com as parcelas
    const todasPagas = todasParcelas.length > 0 && todasParcelas.every(p => p.status === "PAGO");
    let novoStatusContrato = status;
    if (todasPagas) {
      novoStatusContrato = "QUITADO";
    } else if (!todasPagas && status === "QUITADO") {
      novoStatusContrato = "ATIVO";
    }

    const emprestimo = await prisma.emprestimo.update({
      where: { id },
      data: {
        status: novoStatusContrato ?? undefined,
        dataInicio: dataInicio ? new Date(dataInicio + "T12:00:00") : undefined,
        dataVencimento: dataVencimento ? new Date(dataVencimento + "T12:00:00") : undefined,
        observacoes: observacoes !== undefined ? (observacoes || null) : undefined,
        taxaAtraso: taxaAtraso !== undefined ? Number(taxaAtraso) : undefined,
        taxaJuros: taxaJuros !== undefined ? Number(taxaJuros) : undefined,
        valorPrincipal: valorPrincipal !== undefined ? Number(valorPrincipal) : undefined,
        numParcelas,
        valorTotal,
        totalJuros,
      }
    });

    return NextResponse.json(emprestimo);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao atualizar contrato." }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.emprestimo.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Erro." }, { status: 500 }); }
}
