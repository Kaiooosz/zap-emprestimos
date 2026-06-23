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
    const { status, dataInicio, dataVencimento, observacoes, taxaAtraso, taxaJuros, valorPrincipal, parcelas } = body;

    const emprestimo = await prisma.emprestimo.update({
      where: { id },
      data: {
        status: status ?? undefined,
        dataInicio: dataInicio ? new Date(dataInicio + "T12:00:00") : undefined,
        dataVencimento: dataVencimento ? new Date(dataVencimento + "T12:00:00") : undefined,
        observacoes: observacoes !== undefined ? (observacoes || null) : undefined,
        taxaAtraso: taxaAtraso !== undefined ? Number(taxaAtraso) : undefined,
        taxaJuros: taxaJuros !== undefined ? Number(taxaJuros) : undefined,
        valorPrincipal: valorPrincipal !== undefined ? Number(valorPrincipal) : undefined,
      }
    });

    if (parcelas && Array.isArray(parcelas)) {
      for (const p of parcelas) {
        await prisma.parcela.update({
          where: { id: p.id },
          data: {
            dataVencimento: new Date(p.dataVencimento + "T12:00:00"),
          }
        });
      }
    }

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
