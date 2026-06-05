import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        emprestimos: {
          include: { parcelas: { orderBy: { numero: "asc" } } },
          orderBy: { createdAt: "desc" },
        },
        scoreHistorico: { orderBy: { data: "desc" }, take: 50 },
      },
    });
    if (!cliente) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(cliente);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const cliente = await prisma.cliente.update({
      where: { id },
      data: {
        nome:          body.nome,
        cpf:           body.cpf || null,
        phone:         body.phone,
        email:         body.email || null,
        endereco:      body.endereco || null,
        cidade:        body.cidade || null,
        estado:        body.estado || null,
        profissao:     body.profissao || null,
        rendaMensal:   body.rendaMensal ? Number(body.rendaMensal) : null,
        temContrato:   body.temContrato ?? false,
        garantia:      body.garantia ?? false,
        tipoGarantia:  body.tipoGarantia || null,
        valorGarantia: body.valorGarantia ? Number(body.valorGarantia) : null,
        descGarantia:  body.descricaoGarantia || null,
        observacoes:   body.observacoes || null,
      },
    });
    return NextResponse.json(cliente);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao atualizar." }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.cliente.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao deletar." }, { status: 500 });
  }
}
